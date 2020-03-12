const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const api = require('./src/api/api');
const recipe = require('./src/api/recipe');
const image = require('./src/api/image');
const dotenv = require('dotenv');
const logger = require('./config/winston');
let cors = require('cors');
const Redis = require("ioredis");
//const redis = new Redis();

var counter = require('./src/api/metrics');

const apiMetrics = require('prometheus-api-metrics');
app.use(apiMetrics());
dotenv.config();


const {
  PORT,
  REDIS_SENTINEL_HOSTNAME,
  REDIS_MASTERNAME,
  REDIS_SENTINEL_PORT,
  REDIS_PASSWORD
} = process.env;


app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);



app.listen(PORT, () => {
  console.log(`App running on PORT ${PORT}.`);
});

app.post('/v1/user', api.createUser);
app.put('/v1/user/self', api.updateUser);
app.get('/v1/user/self', api.getUser);

app.post('/v1/recipe/', recipe.createRecipe);
app.delete('/v1/recipe/:recipeId', recipe.deleteRecipe);
app.delete('/v1/recipe/', recipe.deleteRecipe);

app.put('/v1/recipe/:recipeId', recipe.updateRecipe);
app.get('/v1/allrecipes/', recipe.getAllRecipes);
app.get('/v1/recipes/', recipe.getNewRecipe);
app.get('/v1/recipe/:recipeId', recipe.getRecipe);

// API's for Images
app.get('/v1/recipe/:recipeId/image/:imageId', image.getImage);
app.post('/v1/recipe/:recipeId/image', image.uploadImage);
app.delete('/v1/recipe/:recipeId/image/:imageId', image.deleteImage);


app.get('/howyoudoin', (request, response) => {
  counter.health.inc();
  return response.status(200).send({
    message: 'all good'
  });
});

app.get('/redisLivenessCheck', (request, response) => {

  const redis = new Redis({
    sentinels: [
      { host: REDIS_SENTINEL_HOSTNAME, port: REDIS_SENTINEL_PORT }
    ],
    name: REDIS_MASTERNAME,
    password: REDIS_PASSWORD,
    sentinelPassword: REDIS_PASSWORD
  });

  redis.on('connect', function () {
    console.log("Redis Connected Successfully");
    redis.set('testkey', 'testvalue');
    console.log("Successfully added test key to Redis cache");
    redis.get('testkey', function (error, result) {
      console.log('GET result: ' + result);
    });
    return response.status(200).send({
      message: 'Redis connection successful'
    });

  });

  redis.on('error', function (err) {
    console.log('Redis Exception:', err);
  });
});

module.exports = app;