const {
    Client
} = require('pg');
const dotenv = require('dotenv');

dotenv.config();
const {
    DB_USER,
    DB_PASSWORD,
    DB_PORT,
    DB_SCHEMA,
} = process.env;

const connectionString = process.env.DATABASE_URL || `postgres://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_SCHEMA}`;

//const connectionString = process.env.DATABASE_URL || `postgres://${RDS_USER_NAME}:${RDS_PASSWORD}@${RDS_CONNECTION_STRING}:5432/${RDS_DB_NAME}`;
console.log(connectionString);
const client = new Client(connectionString);

console.log("Creating the tables..");

client.connect(function (err) {
    if (err) {
        return console.error('Could not connect to Postgres', err);
    }
    client.query(
        'CREATE TABLE IF NOT EXISTS APPUSERS( \
     id VARCHAR(36) PRIMARY KEY, \
     emailaddress VARCHAR(100) UNIQUE NOT NULL, \
     firstname VARCHAR(40) not null, \
     lastname VARCHAR(40), \
     password VARCHAR(65) NOT NULL, \
     account_created timestamp NOT NULL, \
     account_updated timestamp NOT NULL \
     );',
        function (err, result) {
            if (err) {
                return console.error('Error running create table query', err);
            } else {
                console.log("Successfully created user table.");

                client.query(
                    'CREATE TABLE IF NOT EXISTS RECIPE( \
                     recipe_id VARCHAR(50) PRIMARY KEY, \
                     created_ts timestamp NOT NULL, \
                     updated_ts timestamp NOT NULL,\
                     author_id VARCHAR(36),\
                     FOREIGN KEY(author_id) REFERENCES APPUSERS(id),\
                     cook_time_in_min int NOT NULL, \
                     prep_time_in_min int NOT NULL, \
                     total_time_in_min int, \
                     title VARCHAR(200) NOT NULL, \
                     cusine VARCHAR(100) NOT NULL, \
                     servings int not null check(servings between 1 and 5),\
                     ingredients VARCHAR NOT NULL \
                    );',


                    function (err, result) {
                        if (err) {
                            return console.error('Error running create table query', err);
                        } else {
                            console.log("Successfully created recipe table.");

                        }
                    });

            }
        });
});

module.exports = {
    connection: client
};