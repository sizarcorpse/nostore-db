class Database {
  constructor() {
    console.log("Database constructor");
    if (!localStorage.getItem("store")) {
      localStorage.setItem("store", JSON.stringify({}));
    }
  }

  collection(collectionName) {
    if (!this[collectionName]) {
      this.createCollection(collectionName);
    }
    return {
      insert: (data) => this.insert(collectionName, data),
      find: (query) => this.find(collectionName, query),
      findOne: (query) => this.findOne(collectionName, query),
      update: (query, data) => this.update(collectionName, query, data),
      updateOne: (query, data) => this.updateOne(collectionName, query, data),
      delete: (query) => this.delete(collectionName, query),
      deleteOne: (query) => this.deleteOne(collectionName, query),
    };
  }

  createCollection(collectionName) {
    let store = JSON.parse(localStorage.getItem("store"));
    if (!store[collectionName]) {
      store[collectionName] = [];
    }
    localStorage.setItem("store", JSON.stringify(store));
  }

  insert(collectionName, data) {
    let store = JSON.parse(localStorage.getItem("store"));
    if (!Array.isArray(data)) {
      data = [data];
    }
    data = data.map((item) => ({
      _id: Math.random().toString(36).slice(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...item,
    }));
    store[collectionName].push(...data);
    localStorage.setItem("store", JSON.stringify(store));
  }

  find(collectionName, query) {
    let store = JSON.parse(localStorage.getItem("store"));
    let collection = store[collectionName];
    let result = collection.filter((item) => {
      let match = true;
      for (let key in query) {
        if (query[key] !== item[key]) {
          match = false;
          break;
        }
      }
      return match;
    });

    let sortField = null;
    let sortOrder = "asc";
    let limitCount = null;
    let skipCount = null;

    let chainable = {
      sortBy: (field) => {
        sortField = field;
        return chainable;
      },
      orderBy: (order) => {
        sortOrder = order;
        return chainable;
      },
      limitBy: (count) => {
        limitCount = count;
        return chainable;
      },
      skipBy: (count) => {
        skipCount = count;
        return chainable;
      },
      exec: () => {
        if (sortField) {
          result.sort((a, b) => {
            if (sortOrder === "asc") {
              return a[sortField] > b[sortField]
                ? 1
                : b[sortField] > a[sortField]
                ? -1
                : 0;
            } else {
              return a[sortField] < b[sortField]
                ? 1
                : b[sortField] < a[sortField]
                ? -1
                : 0;
            }
          });
        }
        if (skipCount !== null) {
          result = result.slice(skipCount);
        }
        if (limitCount !== null) {
          result = result.slice(0, limitCount);
        }
        return result;
      },
    };

    return chainable;
  }

  findOne(collectionName, query) {
    let store = JSON.parse(localStorage.getItem("store"));
    let collection = store[collectionName];
    for (let item of collection) {
      let match = true;
      for (let key in query) {
        if (query[key] !== item[key]) {
          match = false;
          break;
        }
      }
      if (match) {
        return item;
      }
    }
    return null;
  }

  update(collectionName, query, data) {
    let store = JSON.parse(localStorage.getItem("store"));
    let collection = store[collectionName];
    let updatedDocuments = [];
    collection.forEach((item, index) => {
      let match = true;
      for (let key in query) {
        if (query[key] !== item[key]) {
          match = false;
          break;
        }
      }
      if (match) {
        collection[index] = { ...item, ...data };
        updatedDocuments.push(collection[index]);
      }
    });
    store[collectionName] = collection;
    localStorage.setItem("store", JSON.stringify(store));
    return updatedDocuments;
  }

  updateOne(collectionName, query, data) {
    let store = JSON.parse(localStorage.getItem("store"));
    let collection = store[collectionName];
    let updatedDocument = null;
    for (let i = 0; i < collection.length; i++) {
      let match = true;
      for (let key in query) {
        if (query[key] !== collection[i][key]) {
          match = false;
          break;
        }
      }
      if (match) {
        collection[i] = { ...collection[i], ...data };
        updatedDocument = collection[i];
        break;
      }
    }
    store[collectionName] = collection;
    localStorage.setItem("store", JSON.stringify(store));
    return updatedDocument;
  }

  delete(collectionName, query) {
    let store = JSON.parse(localStorage.getItem("store"));
    let collection = store[collectionName];
    let deletedDocuments = [];
    store[collectionName] = collection.filter((item) => {
      let match = true;
      for (let key in query) {
        if (query[key] !== item[key]) {
          match = false;
          break;
        }
      }
      if (match) {
        deletedDocuments.push(item);
      }
      return !match;
    });
    localStorage.setItem("store", JSON.stringify(store));
    return deletedDocuments;
  }

  deleteOne(collectionName, query) {
    let store = JSON.parse(localStorage.getItem("store"));
    let collection = store[collectionName];
    let deletedDocument = null;
    for (let i = 0; i < collection.length; i++) {
      let match = true;
      for (let key in query) {
        if (query[key] !== collection[i][key]) {
          match = false;
          break;
        }
      }
      if (match) {
        deletedDocument = collection.splice(i, 1)[0];
        break;
      }
    }
    store[collectionName] = collection;
    localStorage.setItem("store", JSON.stringify(store));
    return deletedDocument;
  }
}

const db = new Database();
const users = db.collection("users");
const posts = db.collection("posts");
