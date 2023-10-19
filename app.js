/* 
TODO:[] count(query).
TODO:[] exists(query).
TODO:[] distinct(field).
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
}

class Collection {
  constructor(database, collectionName) {
    if (!collectionName) {
      throw new Error("A collection name is required.");
    }
    if (typeof collectionName !== "string" || collectionName.length < 3) {
      throw new Error(
        "The collection name must be a string and have at least 3 characters."
      );
    }
    this.database = database;
    this.collectionName = collectionName;

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
    for (let key in condition) {
      if (Array.isArray(condition[key])) {
        if (
          !condition[key].some((value) =>
            this.compareValues(document[key], value)
          )
        ) {
          return false;
        }
      } else if (!this.compareValues(document[key], condition[key])) {
        return false;
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

      let _id = "xxxxxxxx-xxxx-xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          let r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );

      item._id = _id;
      item.createdAt = new Date().toISOString();
      item.updatedAt = new Date().toISOString();

      collection.push(item);
    });

    localStorage.setItem(this.database.dbName, JSON.stringify(store));

    return data;
  }

  findById(id) {
    if (typeof id !== "string" || id.length !== 35) {
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
    if (typeof id !== "string" || id.length !== 35) {
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
    if (typeof id !== "string" || id.length !== 35) {
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
}

const db = new Database("store");
const users = db.collection("users");

// const fbi = users.findById("e6f72b15-9e14-817-b7d6-cdb1f84eb333");
// console.log(fbi);

// const user = users
//   .find([{ first_name: "Sizar" }, { age: "20" }])
//   .sortBy("age")
//   .orderBy("asc")
//   .limitBy(4)
//   .exec();
// console.log(user.length);
// user.map((item) => console.log(item));

// console.log(users.find([{ city: "New York" }, { city: "Vicksburg" }]).exec());
// const uu = users.update([{ city: "New York" }, { city: "Vicksburg" }], {
//   age: "100",
// });
// console.log(uu);

// const ubi = users.updateById("e6f72b15-9e14-817-b7d6-cdb1f84eb333", {
//   city: "New York",
// });
// const dbi = users.removeById("757a0cb5-103a-efb-a322-ed9ad12be0a1");
// console.log(dbi);

/*

*/
