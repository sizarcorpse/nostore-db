# New Database()

- [New Database()](#new-database)
  - [Database](#database)
  - [Collection](#collection)
    - [Create : `crete(data)` | `create([data,...])`](#create--cretedata--createdata)
    - [Find By Id : `findById(id)`](#find-by-id--findbyidid)
    - [Find One : `findOne(query)`](#find-one--findonequery)
    - [Find : `find(query)`](#find--findquery)
    - [Update By Id : `updateById(id, data)`](#update-by-id--updatebyidid-data)
    - [Update: `update(query, data)` | `update([query,...], data)`](#update-updatequery-data--updatequery-data)
    - [Remove By Id : `removeById(id)`](#remove-by-id--removebyidid)
    - [Remove: `remove(query)` | `remove([query,...])`](#remove-removequery--removequery)
  - [Query : `{<query operator>}`](#query--query-operator)
    - [`$gt`](#gt)
    - [`$gte`](#gte)
    - [`$lt`](#lt)
    - [`$lte`](#lte)
    - [`$eq`](#eq)
    - [`$ne`](#ne)
    - [`$in`](#in)
    - [`$nin`](#nin)
    - [`$or`](#or)
    - [`$and`](#and)
    - [`$not`](#not)
  - [Middleware](#middleware)
    - [Pre : `pre(event, fn)`](#pre--preevent-fn)
    - [Post : `post(event, fn)`](#post--postevent-fn)
  - [Static Methods `addStaticMethod(name, fn)`](#static-methods-addstaticmethodname-fn)
  - [Schema](#schema)
    - [Field Definitions](#field-definitions)

## Database

## Collection

### Create : `crete(data)` | `create([data,...])`

- Description: `create()` method creates a new document in the collection. It takes an object as an argument. The object must contain the data to be stored in the document. It also take an array of objects as an argument. it returns a promise that resolves with the newly created document.
- Arguments: `data` - `object` | `array of objects`
- Returns: A promise that resolves with the newly created document.
- Example:

  ```js
  // single object
  const users = db.collection("users");

  const data = {
    name: "John",
    age: 30,
    address: {
      city: "New York",
      country: "USA",
    },
  };
  users
    .create(data)
    .then((data) => {
      console.log("post create", data);
    })
    .catch((error) => {
      console.log(error.code, error.message);
    });
  ```

  ```js
  // array of objects
  const users = db.collection("users");

  const data = [
    {
      name: "John",
      age: 30,
      address: {
        city: "New York",
        country: "USA",
      },
    },
    {
      name: "Jane",
      age: 25,
      address: {
        city: "London",
        country: "UK",
      },
    },
  ];
  users
    .create(data)
    .then((data) => {
      console.log("posts create", data);
    })
    .catch((error) => {
      console.log(error.code, error.message);
    });
  ```

- Error Code:

  - `ccr001`: "Data must be a non-empty array of objects.",
  - `ccr002`: "Data must be an object.",
  - `ccr003`: "Data must be a non-empty object.",

### Find By Id : `findById(id)`

- Description: `findById()` method finds a document by its `id`.
- Arguments: `id` - `string`
- Returns: A promise that resolves with the document.
- Example:

  ```js
  const users = db.collection("users");

  users
    .findById("ro3t9hk9jn-4da0ece6440")
    .then((data) => {
      console.log("post find", data);
    })
    .catch((error) => {
      console.log(error.code, error.message);
    });
  ```

- Error Code:

  - cfi001: "Id must non-empty string.",
  - cfi002: "Invalid document Id.",
  - cfo003: "No document found with the provided id",

### Find One : `findOne(query)`

- Description: `findOne()` method finds a document that matches the provided query.
- Arguments: `query` - `object` | `array of objects`
- Returns: A promise that resolves with the document.
- Example:

  ```js
  const users = db.collection("users");

  users
    .findOne({ name: "John" })
    .then((data) => {
      console.log("post find", data);
    })
    .catch((error) => {
      console.log(error.code, error.message);
    });
  ```

  ```js
  // multiple query | array of queries

  const users = db.collection("users");
  const query = [{ name: "John" }, { age: 25 }];

  users
    .findOne(query)
    .then((data) => {
      console.log("post find", data);
    })
    .catch((error) => {
      console.log(error.code, error.message);
    });
  ```

- Error Code:

  - cfo001: "Query must be non-empty.",
  - cfo002: "Query must be non-empty object or array of objects.",
  - cfo003: "Invalid query.",
  - cfo004: "No document found with the provided query.",

### Find : `find(query)`

- Description: `find()` method finds all documents that matches the provided query.
- Arguments: `query` - `object` | `array of objects`
- Returns: A promise that resolves with the `chainable` => `sortBy()`, `orderBy()`,`limitBy()`, `skipBy()`, `exec()`,
- Example:

  ```js
  const query = [
    {
      country: "UK",
    },
    {
      gender: "M",
    },
  ];

  users
    .find(query)
    .then((chainable) => {
      return chainable.exec();
    })
    .then((data) => {
      console.log(data);
    });
  ```

  ```js
  const query = [
    {
      city: "Chicago",
    },
    {
      gender: "M",
    },
  ];

  users
    .find(query)
    .then((chainable) => {
      return chainable.sortBy("age").orderBy("desc").exec();
    })
    .then((data) => {
      console.log(data);
    });
  ```

  ```js
  const query = [
    {
      gender_abbr: "M",
    },
  ];

  users
    .find(query)
    .then((chainable) => {
      return chainable
        .sortBy("age")
        .orderBy("desc")
        .limitBy(10)
        .skipBy(5)
        .exec();
    })
    .then((data) => {
      console.log(data);
    })
    .catch((error) => {
      console.log(error.code, error.message);
    });
  ```

  ```js
  // pagination

  const query = [
    {
      gender_abbr: "M",
    },
  ];
  let pageNumber = 1;
  let pageSize = 10;

  users
    .find({ gender_abbr: "M" })
    .then((chainable) => {
      return chainable
        .sortBy("first_name")
        .limitBy(pageSize)
        .skipBy((pageNumber - 1) * pageSize)
        .exec();
    })
    .then((data) => {
      console.log(data);
    });
  ```

### Update By Id : `updateById(id, data)`

- Description: `updateById()` method updates a document by its `id`.
- Arguments: `id` - `string`, `data` - `object`
- Returns: A promise that resolves with the updated document.
- Example:

  ```js
  const db = new Database("store");
  const users = db.collection("users");

  users
    .updateById("r9g3cyfozn-4da12ed2694", {
      nickname: "Holo",
      bio: "I am a wolf harvest deity.",
    })
    .then((updatedData) => {
      console.log(updatedData);
    })
    .catch((error) => {
      console.log(error.code, error.message);
    });
  ```

- Error Code:

  - cui001: "Invalid data, Must have an \_id and data",
  - cui002: "Must provide an \_id",
  - cui003: "Must be a valid document id",
  - cdi004: "Invalid data",
  - cdi005: "No document found with the provided id",

### Update: `update(query, data)` | `update([query,...], data)`

- Description: `update()` method updates all documents that matches the provided query.
- Arguments: `query` - `object` | `array of objects`, `data` - `object`
- Returns: A promise that resolves with the updated document.
- Example:

  ```js
  users
    .update(
      {
        _id: "r9g3cyfozn-4da12ed2694",
      },
      {
        nickname: "Holo",
        bio: "I am a wolf harvest deity.",
      }
    )
    .then((updatedData) => {
      console.log(updatedData);
    })
    .catch((error) => {
      console.log(error.code, error.message);
    });
  ```

  ```js
  // multiple query | array of queries
  users
    .update(
      [
        {
          city: "chicago",
        },
        {
          gender_abbr: "M",
        },
      ],

      {
        nickname: "Holo",
        bio: "I am a wolf harvest deity.",
      }
    )
    .then((updatedData) => {
      console.log(updatedData);
    })
    .catch((error) => {
      console.log(error.code, error.message);
    });
  ```

- Error Code:
  - cu001: "Invalid data, Must have an query and data",
  - cd002: "Invalid data",
  - cu003: "Invalid query.",

### Remove By Id : `removeById(id)`

- Description: `removeById()` method deletes a document by its `id`.
- Arguments: `id` - `string`
- Returns: A promise that resolves with the deleted document.
- Example:

  ```js
  users
    .removeById("r9g3cyfozn-4da12ed2694")
    .then((deleteData) => {
      console.log(deleteData);
    })
    .catch((error) => {
      console.log(error.code, error.message);
    });
  ```

- Error Code:
  - cmi001: "Id must non-empty string.",
  - cmi002: "Invalid document Id.",
  - cmi003: "No document found with the provided id",

### Remove: `remove(query)` | `remove([query,...])`

- Description: `remove()` method deletes all documents that matches the provided query.
- Arguments: `query` - `object` | `array of objects`
- Returns: A promise that resolves with the deleted document.
- Example:

  ```js
  users
    .remove({
      city: "Chicago",
    })
    .then((deleteData) => {
      console.log(deleteData);
    })
    .catch((error) => {
      console.log(error.code, error.message);
    });
  ```

- Error Code:
  - cm001: "Query must be non-empty.",
  - cm002: "Query must be non-empty object or array of objects.",
  - cm003: "Invalid query.",

## Query : `{<query operator>}`

### `$gt`

- Description: `$gt` operator selects those documents where the value of the field is greater than (i.e. >) the specified value.
- Example: `db.collection("users").find({ age: { $gt: 25 } })`

### `$gte`

- Description: `$gte` operator selects the documents where the value of the field is greater than or equal to (i.e. >=) a specified value.
- Example: `db.collection("users").find({ age: { $gte: 25 } })`

### `$lt`

- Description: `$lt` operator selects the documents where the value of the field is less than (i.e. <) the specified value.
- Example: `db.collection("users").find({ age: { $lt: 25 } })`

### `$lte`

- Description: `$lte` operator selects the documents where the value of the field is less than or equal to (i.e. <=) the specified value.
- Example: `db.collection("users").find({ age: { $lte: 25 } })`

### `$eq`

- Description: `$eq` operator selects the documents where the value of the field is equal to (i.e. ==) the specified value.
- Example: `db.collection("users").find({ age: { $eq: 25 } })`

### `$ne`

- Description: `$ne` operator selects the documents where the value of the field is not equal to (i.e. !=) the specified value.
- Example: `db.collection("users").find({ age: { $ne: 25 } })`

### `$in`

- Description: `$in` operator selects the documents where the value of a field equals any value in the specified array.
- Example: `db.collection("users").find({ age: { $in: [25, 30] } })`

### `$nin`

- Description: `$nin` operator selects the documents where the value of the field is not in the specified array or the field does not exist.
- Example: `db.collection("users").find({ age: { $nin: [25, 30] } })`

### `$or`

- Description: `$or` operator performs a logical OR operation on an array of two or more <expressions> and selects the documents that satisfy at least one of the <expressions>.
- Example: `db.collection("users").find({ $or: [{ age: 25 }, { age: 30 }] })`

### `$and`

- Description: `$and` operator performs a logical AND operation on an array of two or more <expressions> and selects the documents that satisfy all the <expressions>.
- Example: `db.collection("users").find({ $and: [{ age: 25 }, { age: 30 }] })`

### `$not`

- Description: `$not` operator performs a logical NOT operation on the specified <operator-expression> and selects the documents that do not match the <operator-expression>.
- Example: `db.collection("users").find({ age: { $not: { $eq: 25 } } })`

## Middleware

### Pre : `pre(event, fn)`

- Description: `pre()` method is used to register a middleware function. The middleware function is executed before the specified event.
  - `event`:This is a string that represents the event before which the middleware function will be executed. The possible values include `create`, `find`, `findOne`, `findById`, `update`, `updateById`, `remove`, and `removeById`.
  - `fn(data, next)`: This is the middleware function to be executed. It accepts two parameters:
    - `data|query`: This is an object that contains the data to be passed to the middleware function.
    - `next`: This is a function that should be called after the middleware function has finished executing. If `next()` is not called, the specified event will not be executed.
- Example:

  ```js
  users.pre("findOne", (data, next) => {
    console.log("pre findOne");
    // do something with `data`
    next();
  });
  ```

  ```js
  users.pre("create", (data, next) => {
    data.created_at = new Date().toISOString();
    next();
  });
  ```

### Post : `post(event, fn)`

- Description: `post()` method is used to register a middleware function. The middleware function is executed after the specified event.
  - `event`:This is a string that represents the event after which the middleware function will be executed. The possible values include `create`, `find`, `findOne`, `findById`, `update`, `updateById`, `remove`, and `removeById`.
  - `fn(data, next)`: This is the middleware function to be executed. It accepts two parameters:
    - `data`: This is an object that contains the data returned from the specified event.
    - `next`: This is a function that should be called after the middleware function has finished executing. If `next()` is not called, the specified event will not be executed.
- Example:

  ```js
  users.post("findOne", (data, next) => {
    console.log("post findOne");
    // do something with `data`
  });
  ```

  ```js
  users.post("create", (data, next) => {
    console.log("post create", data);
  });
  ```

## Static Methods `addStaticMethod(name, fn)`

- Description: `addStaticMethod()` method is used to add a static method to the collection. A static method is a method that can be called directly on the collection without having to create an instance of the collection.
- Arguments:
  - `name`: This is a string that represents the name of the static method.
  - `fn`: This is the function to be executed when the static method is called.
- Example:

  ```js
  const db = new Database("store");
  const users = db.collection("users");

  // add static method
  users.addStaticMethod("getUserByFirstName", function (firstName) {
    return this.findOne({ first_name: firstName });
  });

  // call static method
  users
    .getUserByFirstName("John")
    .then((data) => {
      console.log(data);
    })
    .catch((error) => {
      console.log(error.code, error.message);
    });
  ```

## Schema

The `Schema` class is a JavaScript class that provides a way to validate data against a defined schema. The schema is a JavaScript object that defines the structure, type, and other constraints of the data.

### Field Definitions

- `type`: This is a string that represents the type of the field. The possible values include `string`, `number`, `boolean`, `date`, `array`, and `object`.

  ```js
  let schema = new Schema({
    name: {
      type: "string",
    },
  });
  ```

- `required`: This is a boolean that indicates whether the field is required or not. The default value is `false`.

  ```js
  let schema = new Schema({
    name: {
      required: true,
    },
  });
  ```

- `min`: This is a number that represents the minimum value of the field. It is applicable to `number`, `string`,`array`, and `object` fields.

  ```js
  let schema = new Schema({
    age: {
      min: 18,
    },
  });
  ```

  ```js
  let schema = new Schema({
    name: {
      min: 5,
    },
  });
  ```

- `max`: This is a number that represents the maximum value of the field. It is applicable to `number`, `string`,`array`, and `object` fields.

  ```js
  let schema = new Schema({
    age: {
      max: 60,
    },
  });
  ```

  ```js
  let schema = new Schema({
    name: {
      max: 10,
    },
  });
  ```

- `pattern`: This is a regular expression that represents the pattern of the field. It is applicable to `string` fields.

  ```js
  let schema = new Schema({
    email: {
      pattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
    },
  });
  ```

- `enum`: This is an array of values that represents the possible values of the field. It is applicable to `string` and `number` fields.

  ```js
  let schema = new Schema({
    role: {
      type: "string",
      default: "user",
      enum: ["admin", "user"],
    },
  });
  ```

- `properties` : This is an object that represents the properties of the field. It is applicable to `object` fields.

  ```js
  let schema = new Schema({
    address: {
      type: "object",
      properties: {
        city: {
          type: "string",
          required: true,
          min: 3,
          max: 10,
        },
        street: {
          type: "string",
          required: true,
          min: 3,
          max: 10,
        },
      },
    },
  });
  ```

- `items` : This is an object that represents the items of the field. It is applicable to `array` fields.
- `default` : This is a value that represents the default value of the field.

  ```js
  let schema = new Schema({
    tile: {
      default: "Untitled",
    },
  });
  ```

- `validate`: This is a function that is used to validate the field. It accepts two parameters: `value` and `prop`. The `value` parameter represents the value of the field. The `prop` parameter represents the properties of the other fields in the schema. The function should return `true` if the field is valid, otherwise it should return `false`.

  ```js
  let schema = new Schema({
    isAvailable: {
      validate: (value, prop) => {
        if (prop.age < 18) {
          return false;
        } else {
          return true;
        }
      },
    },
  });
  ```
