const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

// pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => {console.log(response)});

// const properties = require('./json/properties.json');
const users = require('./json/users.json');

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  const query = `SELECT * FROM users WHERE users.email = $1;`

  return pool.query(query, [email])
    .then((result) => {
      console.log(result.rows[0]);
      return result.rows[0];
    })
    .catch((err) => {
      console.log(null);
      return null;
    });


  // let user;
  // for (const userId in users) {
  //   user = users[userId];
  //   if (user.email.toLowerCase() === email.toLowerCase()) {
  //     break;
  //   } else {
  //     user = null;
  //   }
  // }
  // return Promise.resolve(user);
}
exports.getUserWithEmail = getUserWithEmail;



/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {

  const query = `SELECT * FROM users WHERE users.id = $1;`

  return pool.query(query, [id])
    .then((result) => {
      console.log(result.rows[0]);
      return result.rows[0];
    })
    .catch((err) => {
      console.log(null);
      return null;
    });


  // return Promise.resolve(users[id]);
}
exports.getUserWithId = getUserWithId;



/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  const query = `INSERT INTO
                    users (name, email, password)
                 VALUES
                    ($1, $2, $3)
                 RETURNING *;`

  const args = [ user.name, user.email, user.password ]
  
  return pool.query(query, args)
    .then((result) => {
      console.log(result.rows[0]);
      return result.rows[0];
    })
    .catch((err) => {
      console.log(null);
      return null;
    });
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {

  const query = `SELECT reservations.id,
                        properties.*,
                        reservations.start_date,
                        reservations.end_date,
                        AVG(rating) as average_rating
                 FROM reservations
                 JOIN properties
                   ON reservations.property_id = properties.id
                 JOIN property_reviews
                 ON properties.id = property_reviews.property_id
                 WHERE reservations.guest_id = $1
                 GROUP BY properties.id, reservations.id
                 ORDER BY reservations.start_date
                 LIMIT $2;`

return pool.query(query, [guest_id, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(null);
      return null;
    });
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {

  // {
  //   city: 'toronto',
  //   minimum_price_per_night: '2000',
  //   maximum_price_per_night: '8000',
  //   minimum_rating: '2'
  // }

  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*,
         AVG(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews
    ON properties.id = property_id
  `;

  // 3
  if (options.city) {
    queryParams.push('%' + options.city + '%');
    queryString += `WHERE properties.city ILIKE $${queryParams.length} `;
  }

   // check for results that cost minimum or higher
   if (options.owner_id) {
    if (queryParams.length >= 1) {
      queryParams.push(Number(options.owner_id));
      queryString += `AND owner_id = $${queryParams.length} `;
    } else {
      queryParams.push(Number(options.minimum_price_per_night) * 100);
      queryString += `WHERE owner_id = $${queryParams.length} `;
    }
  }

  // check for results that cost minimum or higher
  if (options.minimum_price_per_night) {
    if (queryParams.length >= 1) {
      queryParams.push(Number(options.minimum_price_per_night) * 100);
      queryString += `AND cost_per_night >= $${queryParams.length} `;
    } else {
      queryParams.push(Number(options.minimum_price_per_night) * 100);
      queryString += `WHERE cost_per_night >= $${queryParams.length} `;
    }
  }

  // check for results that cost maximum or lower
  if (options.maximum_price_per_night) {
    if (queryParams.length > 0) {
      queryParams.push(Number(options.maximum_price_per_night) * 100);
      queryString += `AND cost_per_night <= $${queryParams.length} `;
    } else {
      queryParams.push(Number(options.maximum_price_per_night) * 100);
      queryString += `WHERE cost_per_night <= $${queryParams.length} `;
    }
  }

  // check for results with a rating of at least
  if (options.minimum_rating) {
    queryParams.push(Number(options.minimum_rating));
    queryString += `
    GROUP BY properties.id
    `;
    queryString += `HAVING AVG(property_reviews.rating) >= $${queryParams.length} `;
    queryParams.push(limit);
    queryString += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;
  }

  // 4
  if (!options.minimum_rating) {
    queryParams.push(limit);
    queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;
  }

  // 5
  console.log(options);
  console.log(queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows);
  
  // return pool.query(queryString, queryParams)
  //   .then((result) => {
  //     return result.rows;
  //   })
  //   .catch((err) => {
  //     console.log(null);
  //     return null;
  //   });
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;
