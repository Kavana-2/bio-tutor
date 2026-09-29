"""SQLite document store exposing the small MongoDB-style API used by server.py / auth.py.

Each collection is a table with (_id TEXT PRIMARY KEY, doc TEXT JSON). No external services needed.
"""
import json
import os
import secrets
import sqlite3
import threading


class ObjectId:
    """24-hex string id, drop-in for bson.ObjectId in this app."""

    def __init__(self, oid=None):
        if oid is None:
            self._id = secrets.token_hex(12)
        else:
            s = str(oid)
            if len(s) != 24 or any(c not in "0123456789abcdef" for c in s.lower()):
                raise ValueError(f"'{oid}' is not a valid ObjectId")
            self._id = s.lower()

    def __str__(self):
        return self._id

    def __repr__(self):
        return f"ObjectId('{self._id}')"

    def __eq__(self, other):
        return isinstance(other, ObjectId) and other._id == self._id

    def __hash__(self):
        return hash(self._id)


class _Result:
    def __init__(self, inserted_id=None, deleted_count=0, matched_count=0, modified_count=0):
        self.inserted_id = inserted_id
        self.deleted_count = deleted_count
        self.matched_count = matched_count
        self.modified_count = modified_count
        self.inserted_ids = []


_OPS = {
    "$gt": lambda a, b: a is not None and a > b,
    "$gte": lambda a, b: a is not None and a >= b,
    "$lt": lambda a, b: a is not None and a < b,
    "$lte": lambda a, b: a is not None and a <= b,
    "$ne": lambda a, b: a != b,
    "$in": lambda a, b: a in b,
    "$nin": lambda a, b: a not in b,
    "$exists": lambda a, b: (a is not None) == bool(b),
}


def _matches(doc, flt):
    for key, cond in flt.items():
        val = doc.get(key)
        if isinstance(cond, dict) and cond and all(k.startswith("$") for k in cond):
            for op, arg in cond.items():
                if not _OPS[op](val, arg):
                    return False
        elif key == "_id":
            if str(val) != str(cond):
                return False
        elif val != cond:
            return False
    return True


def _project(doc, projection):
    if not projection:
        return doc
    include = [k for k, v in projection.items() if v and k != "_id"]
    exclude = [k for k, v in projection.items() if not v]
    if include:
        out = {k: doc[k] for k in include if k in doc}
        if projection.get("_id", 1):
            out["_id"] = doc["_id"]
        return out
    return {k: v for k, v in doc.items() if k not in exclude}


class Cursor:
    def __init__(self, coll, flt, projection):
        self._coll, self._flt, self._proj = coll, flt, projection
        self._sort, self._limit = None, None

    def sort(self, key, direction=1):
        self._sort = (key, direction)
        return self

    def limit(self, n):
        self._limit = n
        return self

    async def to_list(self, length=None):
        docs = self._coll._query(self._flt)
        if self._sort:
            key, direction = self._sort
            docs.sort(key=lambda d: (d.get(key) is None, d.get(key)), reverse=direction < 0)
        n = self._limit if self._limit is not None else length
        if n is not None:
            docs = docs[:n]
        return [_project(d, self._proj) for d in docs]


class Collection:
    def __init__(self, db, name):
        self._db, self._name = db, name
        with db._lock:
            db._conn.execute(f'CREATE TABLE IF NOT EXISTS "{name}" (_id TEXT PRIMARY KEY, doc TEXT NOT NULL)')
            db._conn.commit()

    def _load(self, row):
        doc = json.loads(row[1])
        doc["_id"] = ObjectId(row[0])
        return doc

    def _query(self, flt):
        flt = dict(flt or {})
        where, params = [], []
        if "_id" in flt and not isinstance(flt["_id"], dict):
            where.append("_id = ?")
            params.append(str(flt.pop("_id")))
        for key in list(flt):
            val = flt[key]
            if isinstance(val, (str, int, float)) and not isinstance(val, bool) and key != "_id":
                where.append(f"json_extract(doc, '$.{key}') = ?")
                params.append(val)
                flt.pop(key)
        sql = f'SELECT _id, doc FROM "{self._name}"'
        if where:
            sql += " WHERE " + " AND ".join(where)
        with self._db._lock:
            rows = self._db._conn.execute(sql, params).fetchall()
        docs = [self._load(r) for r in rows]
        return [d for d in docs if _matches(d, flt)] if flt else docs

    @staticmethod
    def _dump(doc):
        return json.dumps({k: v for k, v in doc.items() if k != "_id"}, default=str)

    def find(self, flt=None, projection=None):
        return Cursor(self, flt or {}, projection)

    async def find_one(self, flt=None, projection=None, sort=None):
        cur = self.find(flt, projection)
        if sort:
            cur.sort(*sort[0])
        docs = await cur.to_list(1)
        return docs[0] if docs else None

    async def insert_one(self, doc):
        oid = doc.get("_id") or ObjectId()
        with self._db._lock:
            self._db._conn.execute(f'INSERT INTO "{self._name}" (_id, doc) VALUES (?, ?)', (str(oid), self._dump(doc)))
            self._db._conn.commit()
        doc["_id"] = oid
        return _Result(inserted_id=oid)

    async def insert_many(self, docs):
        res = _Result()
        with self._db._lock:
            for doc in docs:
                oid = doc.get("_id") or ObjectId()
                self._db._conn.execute(f'INSERT INTO "{self._name}" (_id, doc) VALUES (?, ?)', (str(oid), self._dump(doc)))
                doc["_id"] = oid
                res.inserted_ids.append(oid)
            self._db._conn.commit()
        return res

    async def update_one(self, flt, update, upsert=False):
        docs = self._query(flt)
        if docs:
            doc = docs[0]
            for k, v in update.get("$set", {}).items():
                doc[k] = v
            for k, v in update.get("$inc", {}).items():
                doc[k] = (doc.get(k) or 0) + v
            with self._db._lock:
                self._db._conn.execute(f'UPDATE "{self._name}" SET doc = ? WHERE _id = ?', (self._dump(doc), str(doc["_id"])))
                self._db._conn.commit()
            return _Result(matched_count=1, modified_count=1)
        if not upsert:
            return _Result()
        doc = {k: v for k, v in flt.items() if not isinstance(v, dict)}
        doc.update(update.get("$setOnInsert", {}))
        doc.update(update.get("$set", {}))
        for k, v in update.get("$inc", {}).items():
            doc[k] = (doc.get(k) or 0) + v
        return await self.insert_one(doc)

    async def delete_one(self, flt):
        docs = self._query(flt)
        if not docs:
            return _Result()
        with self._db._lock:
            self._db._conn.execute(f'DELETE FROM "{self._name}" WHERE _id = ?', (str(docs[0]["_id"]),))
            self._db._conn.commit()
        return _Result(deleted_count=1)

    async def delete_many(self, flt):
        docs = self._query(flt)
        with self._db._lock:
            for d in docs:
                self._db._conn.execute(f'DELETE FROM "{self._name}" WHERE _id = ?', (str(d["_id"]),))
            self._db._conn.commit()
        return _Result(deleted_count=len(docs))

    async def count_documents(self, flt=None):
        return len(self._query(flt))

    async def create_index(self, key, unique=False):
        idx = f"idx_{self._name}_{key}"
        uniq = "UNIQUE" if unique else ""
        with self._db._lock:
            self._db._conn.execute(f'CREATE {uniq} INDEX IF NOT EXISTS "{idx}" ON "{self._name}" (json_extract(doc, \'$.{key}\'))')
            self._db._conn.commit()


class Database:
    def __init__(self, path):
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._lock = threading.RLock()
        self._collections = {}

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self[name]

    def __getitem__(self, name):
        if name not in self._collections:
            self._collections[name] = Collection(self, name)
        return self._collections[name]

    def close(self):
        self._conn.close()
