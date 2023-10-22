/* 
TODO:[] count(query).
TODO:[] exists(query).
TODO:[] distinct(field).
TODO:[] fix case sensitive queries.
TODO:[] fix number sensitive queries.
TODO:[] Error Handling
TODO:[] Validation Schema Support
TODO:[] Association Handling (Populate)(One to One, One to Many, Many to Many)
TODO:[] Hooks/Middleware
TODO:[] Static Methods
TODO:[] Query Optimization
*/

class Database {
  constructor(dbName) {
    if (!dbName) {
      throw new Error("A database name is required.");
    }
    if (typeof dbName !== "string" || dbName.length <= 3) {
      throw new Error(
        "The database name must be a string and have more than 3 characters."
      );
    }
    this.dbName = dbName;
    if (!localStorage.getItem(this.dbName)) {
      localStorage.setItem(this.dbName, JSON.stringify({}));
    }
  }

  collection(collectionName) {
    return new Collection(this, collectionName);
  }

  getInfo() {
    let store = JSON.parse(localStorage.getItem(this.dbName));
    let collectionNames = Object.keys(store);
    let numCollections = collectionNames.length;
    return {
      databaseName: this.dbName,
      numCollections: numCollections,
      collections: collectionNames,
    };
  }

  documentId() {
    let id = "";
    let characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 10; i++) {
      id += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    let now = Date.now();
    let secondPart = Math.floor(now * Math.PI).toString(16);

    return id + "-" + secondPart;
  }

  isValidDocumentId(id) {
    let parts = id.split("-");
    let regex = /^[A-Za-z0-9]{10}$/;
    if (!regex.test(parts[0])) {
      return false;
    }
    let now = Date.now();
    let maxTime = Math.floor(now * Math.PI).toString(16);
    let secondPart = parseInt(parts[1], 16);

    if (isNaN(secondPart) || secondPart > maxTime) {
      return false;
    }

    return true;
  }
}

class Collection {
  constructor(database, collectionName) {
    this.database = database;
    this.collectionName = collectionName;
    this.documentId = this.database.documentId.bind(this.database);
    this.isValidDocumentId = this.database.isValidDocumentId.bind(
      this.database
    );
    this.query = {};

    if (!collectionName) {
      throw new Error("A collection name is required.");
    }
    if (typeof collectionName !== "string" || collectionName.length < 3) {
      throw new Error(
        "The collection name must be a string and have at least 3 characters."
      );
    }

    let store = JSON.parse(localStorage.getItem(this.database.dbName));
    if (!store[this.collectionName]) {
      store[this.collectionName] = [];
      localStorage.setItem(this.database.dbName, JSON.stringify(store));
    }
  }

  getCollectionAndStore() {
    let store = JSON.parse(localStorage.getItem(this.database.dbName));
    if (!store) {
      throw new Error("Database not found");
    }

    let collection = store[this.collectionName];
    if (!collection) {
      throw new Error("Collection not found");
    }

    return { store, collection };
  }

  matchesCondition(document, condition) {
    if (Array.isArray(condition.$or)) {
      return condition.$or.some((cond) =>
        this.matchesCondition(document, cond)
      );
    }

    if (Array.isArray(condition.$and)) {
      return condition.$and.every((cond) =>
        this.matchesCondition(document, cond)
      );
    }

    if (condition.$not) {
      const notConditions = Array.isArray(condition.$not)
        ? condition.$not
        : [condition.$not];
      return notConditions.every(
        (cond) => !this.matchesCondition(document, cond)
      );
    }

    for (let field in condition) {
      if (typeof condition[field] === "object" && condition[field] !== null) {
        for (let operator in condition[field]) {
          switch (operator) {
            case "$gt":
              if (document[field] <= condition[field][operator]) {
                return false;
              }
              break;
            case "$lt":
              if (document[field] >= condition[field][operator]) {
                return false;
              }
              break;
            case "$gte":
              if (document[field] < condition[field][operator]) {
                return false;
              }
              break;
            case "$lte":
              if (document[field] > condition[field][operator]) {
                return false;
              }
              break;
            case "$eq":
              if (document[field] !== condition[field][operator]) {
                return false;
              }
              break;
            case "$ne":
              if (document[field] === condition[field][operator]) {
                return false;
              }
              break;
            case "$in":
              if (!condition[field][operator].includes(document[field])) {
                return false;
              }
              break;
            case "$nin":
              if (condition[field][operator].includes(document[field])) {
                return false;
              }
              break;

            case "$or":
              return condition[field][operator].some((cond) =>
                this.matchesCondition(document, cond)
              );

            case "$and":
              return condition[field][operator].every((cond) =>
                this.matchesCondition(document, cond)
              );

            case "$not":
              return !this.matchesCondition(
                document,
                condition[field][operator]
              );

            default:
              return false;
          }
        }
      } else {
        if (document[field] !== condition[field]) {
          return false;
        }
      }
    }
    return true;
  }

  compareValues(documentValue, queryValue) {
    if (typeof documentValue === "string" && typeof queryValue === "string") {
      return documentValue.toLowerCase() === queryValue.toLowerCase();
    }
    return documentValue === queryValue;
  }

  create(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }

    let { store, collection } = this.getCollectionAndStore();

    data.forEach((item) => {
      if (!item || typeof item !== "object" || Object.keys(item).length === 0) {
        throw new Error("Data must be a non-empty object.");
      }

      let _id = this.documentId();
      item._id = _id;
      item.createdAt = new Date().toISOString();
      item.updatedAt = new Date().toISOString();

      collection.push(item);
    });

    localStorage.setItem(this.database.dbName, JSON.stringify(store));

    return data;
  }

  findById(id) {
    if (typeof id !== "string" || !this.isValidDocumentId(id)) {
      throw new Error("Invalid id");
    }
    let { collection } = this.getCollectionAndStore();
    return collection.find((document) => document._id === id);
  }

  findOne(query) {
    let { collection } = this.getCollectionAndStore();

    if (typeof query !== "object" || query === null) {
      throw new Error("Invalid query");
    }

    if (!Array.isArray(query)) {
      if (typeof query === "object" && query !== null) {
        query = [query];
      } else {
        throw new Error("Invalid query");
      }
    }

    return collection.find((document) =>
      query.some((condition) => this.matchesCondition(document, condition))
    );
  }

  find(query = {}) {
    let { collection } = this.getCollectionAndStore();

    if (!Array.isArray(query)) {
      if (typeof query === "object" && query !== null) {
        query = [query];
      } else {
        throw new Error("Invalid query");
      }
    }

    let results = collection.filter((document) =>
      query.some((condition) => this.matchesCondition(document, condition))
    );

    let chainable = {
      results: results,
      sortField: "createdAt",
      sortOrder: -1,
      limit: 20,
      skip: 0,
      sortBy: function (field) {
        this.sortField = field;
        return this;
      },
      orderBy: function (order) {
        this.sortOrder = order === "desc" ? -1 : 1;
        return this;
      },
      limitBy: function (limit) {
        this.limit = limit;
        return this;
      },
      skipBy: function (skip) {
        this.skip = skip;
        return this;
      },
      exec: function () {
        if (this.sortField) {
          this.results.sort(
            (a, b) =>
              (a[this.sortField] < b[this.sortField] ? -1 : 1) * this.sortOrder
          );
        }
        if (this.skip) {
          this.results = this.results.slice(this.skip);
        }
        if (this.limit) {
          this.results = this.results.slice(0, this.limit);
        }
        return this.results;
      },
    };

    return chainable;
  }

  update(query, data) {
    if (
      typeof data !== "object" ||
      data === null ||
      Object.keys(data).length === 0
    ) {
      throw new Error("Invalid data");
    }

    let { store, collection } = this.getCollectionAndStore();

    if (!Array.isArray(query)) {
      if (typeof query === "object" && query !== null) {
        query = [query];
      } else {
        throw new Error("Invalid query");
      }
    }

    let updatedDocuments = [];
    collection.forEach((document, index) => {
      if (
        query.some((condition) => this.matchesCondition(document, condition))
      ) {
        for (let key in data) {
          document[key] = data[key];
        }
        document.updatedAt = new Date().toISOString();
        updatedDocuments.push(document);
        collection[index] = document;
      }
    });

    store[this.collectionName] = collection;
    localStorage.setItem(this.database.dbName, JSON.stringify(store));

    return updatedDocuments;
  }

  updateById(id, data) {
    if (typeof id !== "string" || !this.isValidDocumentId(id)) {
      throw new Error("Invalid id");
    }

    if (
      typeof data !== "object" ||
      data === null ||
      Object.keys(data).length === 0
    ) {
      throw new Error("Invalid data");
    }

    let { store, collection } = this.getCollectionAndStore();

    let updatedDocument = null;
    collection.forEach((document, index) => {
      if (document._id === id) {
        for (let key in data) {
          document[key] = data[key];
        }
        document.updatedAt = new Date().toISOString();
        updatedDocument = document;
        collection[index] = document;
      }
    });

    if (!updatedDocument) {
      throw new Error("No document found with the provided id");
    }

    store[this.collectionName] = collection;
    localStorage.setItem(this.database.dbName, JSON.stringify(store));

    return updatedDocument;
  }

  remove(query) {
    if (!Array.isArray(query)) {
      if (typeof query === "object" && query !== null) {
        query = [query];
      } else {
        throw new Error("Invalid query");
      }
    }

    let { store, collection } = this.getCollectionAndStore();

    let removedDocuments = [];
    let updatedCollection = collection.filter((document) => {
      if (
        query.length === 0 ||
        query.some((condition) => this.matchesCondition(document, condition))
      ) {
        removedDocuments.push(document);
        return false;
      }
      return true;
    });

    store[this.collectionName] = updatedCollection;
    localStorage.setItem(this.database.dbName, JSON.stringify(store));

    return removedDocuments;
  }

  removeById(id) {
    if (typeof id !== "string" || !this.isValidDocumentId(id)) {
      throw new Error("Invalid id");
    }

    let { store, collection } = this.getCollectionAndStore();

    let removedDocument = null;
    let updatedCollection = collection.filter((document, index) => {
      if (document._id === id) {
        removedDocument = document;
        return false;
      }
      return true;
    });

    if (!removedDocument) {
      throw new Error("No document found with the provided id");
    }

    store[this.collectionName] = updatedCollection;
    localStorage.setItem(this.database.dbName, JSON.stringify(store));

    return removedDocument;
  }

  where(field) {
    return new Query(this, field);
  }
}

class Query {
  constructor(collection, field) {
    this.collection = collection;
    this.query = {};
    this.currentField = field;
  }

  where(field) {
    this.currentField = field;
    return this;
  }

  in(values) {
    this.query[this.currentField] = { $in: values };
    return this;
  }

  gt(value) {
    this.query[this.currentField] = {
      ...this.query[this.currentField],
      $gt: value,
    };
    return this;
  }

  lt(value) {
    this.query[this.currentField] = {
      ...this.query[this.currentField],
      $lt: value,
    };
    return this;
  }

  equals(value) {
    this.query[this.currentField] = {
      ...this.query[this.currentField],
      $eq: value,
    };
    return this;
  }

  or(conditions) {
    this.query[this.currentField] = {
      ...this.query[this.currentField],
      $or: conditions,
    };
    return this;
  }

  and(conditions) {
    this.query[this.currentField] = {
      ...this.query[this.currentField],
      $and: conditions,
    };
    return this;
  }

  exec() {
    return this.collection.find(this.query).exec();
  }
}

const db = new Database("store");
const users = db.collection("users");

let results = users
  .find({
    $not: {
      gender_abbr: { $in: ["M"] },
    },
  })
  .sortBy("age")
  .orderBy("asc")
  .exec();

console.log(results.length);
results.map((user) => console.log(user));

/* 

*/
