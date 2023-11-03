/* 
TODO:[] count(query).
TODO:[] exists(query).
TODO:[] distinct(field).
TODO:[] fix case sensitive queries.
TODO:[] fix number sensitive queries.
TODO:[] Error Handling
TODO:[] Validation Schema Support
TODO:[] Association Handling (Populate)(One to One, One to Many, Many to Many)
TODO:[*] Hooks/Middleware
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
    if (typeof id !== "string") {
      return false;
    }

    let parts = id.split("-");

    if (parts.length !== 2) {
      return false;
    }

    let regex = /^[A-Za-z0-9]{10}$/;
    if (!regex.test(parts[0])) {
      return false;
    }
    let now = Date.now();
    let maxTime = Math.floor(now * Math.PI).toString(16);
    let secondPart = parts[1];

    let hexRegex = /^[0-9A-Fa-f]{1,}$/;
    if (
      !hexRegex.test(secondPart) ||
      parseInt(secondPart, 16) > parseInt(maxTime, 16)
    ) {
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
    this.middlewares = {
      pre: new Map(),
      post: new Map(),
    };
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

  pre(event, fn) {
    if (!this.middlewares.pre.has(event)) {
      this.middlewares.pre.set(event, []);
    }
    this.middlewares.pre.get(event).push(fn);
  }

  post(event, fn) {
    if (!this.middlewares.post.has(event)) {
      this.middlewares.post.set(event, []);
    }
    this.middlewares.post.get(event).push(fn);
  }

  runMiddlewares(type, event, data) {
    const middlewares = this.middlewares[type].get(event) || [];
    let i = 0;

    return new Promise((resolve, reject) => {
      function next(error, modifiedData) {
        if (error) {
          return reject(error);
        }

        if (i < middlewares.length) {
          try {
            middlewares[i++](modifiedData || data, next);
          } catch (error) {
            reject(error);
          }
        } else {
          resolve(modifiedData || data);
        }
      }

      next();
    });
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
              const notConditions = Array.isArray(condition[field][operator])
                ? condition[field][operator]
                : [condition[field][operator]];
              if (
                notConditions.some((cond) =>
                  this.matchesCondition(document, { [field]: cond })
                )
              ) {
                return false;
              }
              break;

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
    return this.runMiddlewares("pre", "create", data)
      .then((modifiedData) => {
        data = modifiedData;

        if (!Array.isArray(data)) {
          data = [data];
        }

        if (data.length === 0) throw new ErrorHandler("ccr001");

        let { store, collection } = this.getCollectionAndStore();
        data.forEach((item) => {
          if (typeof item !== "object" || item === null)
            throw new ErrorHandler("ccr002");

          if (Object.keys(item).length === 0) {
            throw new ErrorHandler("ccr003");
          }

          let _id = this.documentId();
          item._id = _id;
          item.createdAt = new Date().toISOString();
          item.updatedAt = new Date().toISOString();

          collection.push(item);
        });

        localStorage.setItem(this.database.dbName, JSON.stringify(store));

        return this.runMiddlewares("post", "create", data);
      })
      .catch((error) => {
        throw error;
      });
  }

  findById(id) {
    return this.runMiddlewares("pre", "findById", id)
      .then((modifiedId) => {
        if (!modifiedId) throw new ErrorHandler("cfi001");

        if (!this.isValidDocumentId(modifiedId)) {
          throw new ErrorHandler("cfi002");
        }

        let { collection } = this.getCollectionAndStore();
        const document = collection.find(
          (document) => document._id === modifiedId
        );

        return this.runMiddlewares("post", "findById", document);
      })
      .catch((error) => {
        throw error;
      });
  }

  findOne(query) {
    return this.runMiddlewares("pre", "findOne", query).then(
      (modifiedQuery) => {
        if (!modifiedQuery) throw new ErrorHandler("cfo001");

        query = modifiedQuery;

        if (typeof query !== "object" || Object.keys(query).length === 0) {
          throw new ErrorHandler("cfo002");
        }

        let { collection } = this.getCollectionAndStore();

        if (!Array.isArray(query)) {
          if (typeof query === "object" && query !== null) {
            query = [query];
          } else {
            throw new ErrorHandler("cfo003");
          }
        }

        const document = collection.find((document) =>
          query.some((condition) => this.matchesCondition(document, condition))
        );

        return this.runMiddlewares("post", "findOne", document);
      }
    );
  }

  find(query = {}) {
    return this.runMiddlewares("pre", "find", query).then((modifiedQuery) => {
      if (!modifiedQuery) throw new ErrorHandler("cfo001");

      query = modifiedQuery;

      let { collection } = this.getCollectionAndStore();

      if (!Array.isArray(query)) {
        if (typeof query === "object" && query !== null) {
          query = [query];
        } else {
          throw new ErrorHandler("cf001");
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
          if (order !== "asc" && order !== "desc")
            throw new ErrorHandler("cf002");

          this.sortOrder = order === "desc" ? -1 : 1;
          return this;
        },
        limitBy: function (limit) {
          if (typeof limit !== "number" || limit < 0)
            throw new ErrorHandler("cf003");

          this.limit = limit;
          return this;
        },
        skipBy: function (skip) {
          if (typeof skip !== "number" || skip < 0)
            throw new ErrorHandler("cf004");

          this.skip = skip;
          return this;
        },
        exec: function () {
          if (this.sortField) {
            this.results.sort(
              (a, b) =>
                (a[this.sortField] < b[this.sortField] ? -1 : 1) *
                this.sortOrder
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

      return this.runMiddlewares("post", "find", chainable);
    });
  }

  update(query, data) {
    return this.runMiddlewares("pre", "update", { query, data }).then(
      (modifiedData) => {
        if (!modifiedData) throw new ErrorHandler("cui001");

        query = modifiedData.query;
        data = modifiedData.data;

        if (
          typeof data !== "object" ||
          data === null ||
          Object.keys(data).length === 0
        ) {
          throw new ErrorHandler("cu002");
        }

        let { store, collection } = this.getCollectionAndStore();

        if (!Array.isArray(query)) {
          if (typeof query === "object" && query !== null) {
            query = [query];
          } else {
            throw new ErrorHandler("cu003");
          }
        }

        let updatedDocuments = [];
        collection.forEach((document, index) => {
          if (
            query.some((condition) =>
              this.matchesCondition(document, condition)
            )
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

        return this.runMiddlewares("post", "update", updatedDocuments);
      }
    );
  }

  updateById(id, data) {
    return this.runMiddlewares("pre", "updateById", { id, data }).then(
      (modifiedData) => {
        if (!modifiedData) throw new ErrorHandler("cui001");

        id = modifiedData.id;
        data = modifiedData.data;

        if (!id) throw new ErrorHandler("cui002");

        if (!this.isValidDocumentId(id)) {
          throw new ErrorHandler("cui003");
        }

        if (
          typeof data !== "object" ||
          data === null ||
          Object.keys(data).length === 0
        ) {
          throw new ErrorHandler("cdi004");
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
          throw new Error("cdi005");
        }

        store[this.collectionName] = collection;
        localStorage.setItem(this.database.dbName, JSON.stringify(store));

        return this.runMiddlewares("post", "updateById", updatedDocument);
      }
    );
  }

  remove(query) {
    return this.runMiddlewares("pre", "remove", query).then((modifiedQuery) => {
      if (!modifiedQuery) throw new ErrorHandler("cm001");

      query = modifiedQuery;

      if (typeof query !== "object" || Object.keys(query).length === 0) {
        throw new ErrorHandler("cm002");
      }

      if (!Array.isArray(query)) {
        if (typeof query === "object" && query !== null) {
          query = [query];
        } else {
          throw new ErrorHandler("cm003");
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

      return this.runMiddlewares("post", "remove", removedDocuments);
    });
  }

  removeById(id) {
    return this.runMiddlewares("pre", "removeById", id).then((modifiedId) => {
      if (!modifiedId) throw new ErrorHandler("cfi001");

      if (!this.isValidDocumentId(id)) {
        throw new ErrorHandler("cmi002");
      }

      id = modifiedId;

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
        throw new ErrorHandler("cmi003");
      }

      store[this.collectionName] = updatedCollection;
      localStorage.setItem(this.database.dbName, JSON.stringify(store));

      return this.runMiddlewares("post", "removeById", removedDocument);
    });
  }
}

class ErrorHandler extends Error {
  static ERRORS = {
    ccr001: "Data must be a non-empty array of objects.",
    ccr002: "Data must be an object.",
    ccr003: "Data must be a non-empty object.",
    cfi001: "Id must non-empty string.",
    cfi002: "Invalid document Id.",
    cfo001: "Query must be non-empty.",
    cfo002: "Query must be non-empty object or array of objects.",
    cfo003: "Invalid query.",
    cfo004: "No document found with the provided query.",
    cf001: "Invalid query.",
    cf002: "orderBy must be 'asc' or 'desc'",
    cf003: "limitBy must be a positive number.",
    cf004: "skipBy must be a positive number.",
    cui001: "Invalid data, Must have an _id and data",
    cui002: "Must provide an _id",
    cui003: "Must be a valid document id",
    cdi004: "Invalid data",
    cdi005: "No document found with the provided id",
    cu001: "Invalid data, Must have an query and data",
    cd002: "Invalid data",
    cu003: "Invalid query.",
    cri001: "Invalid data, Must have an query and data",
    cri001: "Invalid data, Must have an query and data",
    cri001: "Invalid data, Must have an query and data",
    cmi001: "Id must non-empty string.",
    cmi002: "Invalid document Id.",
    cmi003: "No document found with the provided id",
    cm001: "Query must be non-empty.",
    cm002: "Query must be non-empty object or array of objects.",
    cm003: "Invalid query.",
  };

  constructor(code, customMessage) {
    super();
    this.code = code;
    this.message = customMessage || ErrorHandler.ERRORS[code];
  }
}

const db = new Database("store");
const users = db.collection("users");
const posts = db.collection("posts");
