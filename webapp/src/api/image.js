const AWS = require('aws-sdk');
const formidable = require('formidable');
const fs = require('fs');
const dotenv = require('dotenv');
const db = require('../db');
const uuidv4 = require('uuid/v4');
const database = db.connection;
const format = require('pg-format');
const api = require('./api');
const logger = require('../../config/winston');
const Redis = require("ioredis");
const rec = require("./recipe");
var counter = require('./metrics');
//const redis = new Redis();



dotenv.config();
const {
    S3_BUCKET_NAME,
    AWS_KEY,
    SECRET_KEY,
    REGION,
    REDIS_SENTINEL_HOSTNAME,
    REDIS_MASTERNAME,
    REDIS_SENTINEL_PORT,
    REDIS_PASSWORD
} = process.env;

AWS.config.update({
    accessKeyId: AWS_KEY,
    secretAccessKey: SECRET_KEY,
    region: REGION
});

const redis = new Redis({
    sentinels: [
        { host: REDIS_SENTINEL_HOSTNAME, port: REDIS_SENTINEL_PORT }
    ],
    name: REDIS_MASTERNAME,
    password: REDIS_PASSWORD,
    sentinelPassword: REDIS_PASSWORD
});

console.log("Bucket Name:", S3_BUCKET_NAME);
const ACCEPTABLE_FILE_FORMATS = ['image/jpeg', 'image/png', 'image/jpg'];
const ACCEPTABLE_FILE_SIZE_BYTES = 5 * 100000; // 500 KBs


function getMD5HashFromFile(file) {
    var hash = crypt.createHash("md5")
        .update(file, 'utf-8')
        .digest("hex");
    return hash;
}

// Create an S3 client

var s3 = new AWS.S3();


const uploadImage = (request, response) => {
    logger.info("Image Upload");
    counter.image_upload.inc();
    var recipe_id = request.params.recipeId;
    // new code
    api.authPromise(request).then(
        function (user) {
            var user_id = user.id;
            database.query(
                'SELECT author_id from RECIPE \
            where recipe_id = $1', [recipe_id],
                function (err, recipeResult) {
                    if (err) {
                        logger.error(err);
                        return response.status(500).send({
                            error: 'Error getting recipe'
                        });
                    } else {
                        if (recipeResult.rows.length > 0) {
                            var recipe = recipeResult.rows[0];
                            if (user_id !== recipe.author_id) {
                                return response.status(401).send({
                                    error: 'You do not have permissions!!'
                                });
                            } else {
                                new formidable.IncomingForm().parse(request, (err, fields, files) => {
                                    if (err) {
                                        logger.error(err);
                                        return response.status(500).send({
                                            error: 'Error parsing the uploads'
                                        });
                                    }

                                    if (recipe_id != null) {
                                        database.query(
                                            'SELECT * from IMAGES\
                                            where recipe_id = $1', [recipe_id],
                                            function (err, imageResult) {
                                                if (err) {
                                                    return response.status(400).send({
                                                        error: 'database error'
                                                    });
                                                } else {
                                                    if (imageResult.rows.length != 0 && imageResult.rows[0].id != null) {
                                                        const deleteParams = {
                                                            Bucket: S3_BUCKET_NAME,
                                                            Key: "images/" + imageResult.rows[0].id
                                                        };
                                                        database.query('DELETE FROM IMAGES WHERE id = $1 ', [imageResult.rows[0].id], function (err, result) {
                                                            if (err) {
                                                                logger.error(err);
                                                                return response.status(500).send({
                                                                    error: 'Error deleting the file from DB'
                                                                });
                                                            }
                                                            s3.deleteObject(deleteParams, function (err, data) {
                                                                if (err) {
                                                                    console.log(err);
                                                                    return response.status(500).send({

                                                                        error: 'Error deleting the file from storage system'
                                                                    });
                                                                }
                                                                console.log('File deleted successfully.');

                                                            });
                                                        });
                                                    }
                                                    var image_file = files.image;
                                                    if (!ACCEPTABLE_FILE_FORMATS.includes(image_file.type)) {
                                                        return response.status(400).send({
                                                            error: 'File format is not supported'
                                                        });
                                                    }

                                                    if (image_file.size > ACCEPTABLE_FILE_SIZE_BYTES) {
                                                        return response.status(400).send({
                                                            error: 'File size is higher than 500 KBs'
                                                        });
                                                    }

                                                    const image_uuid = uuidv4();
                                                    const fileContent = fs.readFileSync(image_file.path);
                                                    const params = {
                                                        Bucket: S3_BUCKET_NAME,
                                                        Key: "images/" + image_uuid,
                                                        Body: fileContent,
                                                        Metadata: {
                                                            "name": image_file.name,
                                                            "content_length": image_file.size.toString(),
                                                            "filetype": image_file.type
                                                        }
                                                    };
                                                    s3.upload(params, function (err, data) {
                                                        if (err) {
                                                            logger.error(err);
                                                            console.log(err);
                                                            return response.status(500).send({
                                                                error: 'Error storing the file to storage system'
                                                            });
                                                        }
                                                        console.log(`File uploaded successfully. ${data.Location}`);
                                                        database.query('INSERT INTO IMAGES \
                                        (id, recipe_id, url, content_length, last_modified) VALUES ($1, $2, $3, $4, $5) RETURNING id,url', [image_uuid, recipe_id, data.Location, image_file.size, new Date()], function (err, insertResult) {
                                                            if (err) {
                                                                logger.error(err);
                                                                console.log('error here');
                                                                return response.status(500).send({
                                                                    error: 'Error storing the file metadata'
                                                                });
                                                            } else {
                                                                console.log("Going to delete recipe_id");
                                                                redis.del(recipe_id);
                                                                console.log("deleted recipe_id");
                                                                database.query(
                                                                    'SELECT recipe_id, created_ts, updated_ts, author_id, cook_time_in_min, prep_time_in_min, total_time_in_min, title, cusine, servings, ingredients from RECIPE \
                                                        where recipe_id = $1', [recipe_id],
                                                                    function (err, recipeResult) {
                                                                        if (err) {
                                                                            logger.error(err);
                                                                            return response.status(500).send({
                                                                                error: 'Error getting recipe'
                                                                            });
                                                                        } else {
                                                                            if (recipeResult.rows.length > 0) {
                                                                                recipeResult.rows[0].ingredients = JSON.parse(recipeResult.rows[0].ingredients);
                                                                                database.query("select position, instruction from orderedlist where recipe_id = $1", [recipeResult.rows[0].recipe_id], function (err, resultSteps) {
                                                                                    if (err) {
                                                                                        logger.error(err);
                                                                                        return response.status(500).send({
                                                                                            error: 'Error getting recipe'
                                                                                        });
                                                                                    } else {
                                                                                        database.query("select calories, cholesterol_in_mg, sodium_in_mg, carbohydrates_in_grams, protein_in_grams from nutrition where recipe_id = $1", [recipeResult.rows[0].recipe_id], function (err, resultNutrition) {
                                                                                            if (err) {
                                                                                                logger.error(err);
                                                                                                return response.status(500).send({
                                                                                                    error: 'Error getting recipe'
                                                                                                });
                                                                                            } else {
                                                                                                database.query("select id,url from images where recipe_id = $1", [recipeResult.rows[0].recipe_id], function (err, imageResult) {
                                                                                                    if (err) {
                                                                                                        logger.error(err);
                                                                                                        return response.status(500).send({
                                                                                                            error: 'Error getting images data'
                                                                                                        });
                                                                                                    }
                                                                                                    let redis_json = {
                                                                                                        image: imageResult.rows,
                                                                                                        info: recipeResult.rows[0],
                                                                                                        steps: resultSteps.rows,
                                                                                                        nutrition_information: resultNutrition.rows[0]
                                                                                                    }
                                                                                                    console.log("got the data");
                                                                                                    const final_result = JSON.stringify(redis_json);
                                                                                                    redis.set(recipe_id, final_result, "EX", 600);
                                                                                                    return response.status(200).json(insertResult.rows[0])

                                                                                                })

                                                                                            }
                                                                                        });
                                                                                    }
                                                                                });
                                                                            } else {
                                                                                return response.status(404).send({
                                                                                    error: 'Recipe does not exist!'
                                                                                });
                                                                            }
                                                                        }
                                                                    });

                                                            }
                                                        });
                                                    });
                                                }
                                            });
                                    }
                                });
                            }
                        } else {
                            return response.status(404).send({
                                error: 'Recipe does not exist'
                            });
                        }
                    }
                });
        },
        function (err) {
            logger.error(err);
            response.status(401).send(err);
        }
    );
}

const getImage = (request, response) => {
    logger.info("Get Image");
    counter.image_get.inc();
    var recipe_id = request.params.recipeId;
    var image_id = request.params.imageId;
    if (recipe_id != null && image_id != null) {
        database.query(
            'SELECT id, url from IMAGES\
            where recipe_id = $1 and id =$2', [recipe_id, image_id],
            function (err, imageResult) {
                if (err) {
                    logger.error(err);
                    return response.status(500).send({
                        error: 'Error getting recipe'
                    });
                } else {
                    if (imageResult.rows.length > 0) {
                        let params = {
                            Bucket: S3_BUCKET_NAME,
                            Expires: 120, //seconds
                            Key: "images/" + imageResult.rows[0].id

                        };
                        console.log("Keys" + params.Key);
                        s3.getSignedUrl('getObject', params, (err, data) => {
                            console.log(data);

                            console.log(imageResult.rows[0])
                            return response.status(200).json({
                                image: {
                                    id: imageResult.rows[0].id,
                                    url: data
                                }
                            });
                        });
                    } else {
                        return response.status(404).send({
                            error: 'Image does not exist.'
                        });
                    }
                }

            });
    } else {
        return response.status(404).json({
            info: 'Not found'
        });
    }
}

const deleteImage = (request, response) => {
    counter.image_delete.inc();
    logger.info("Delete Image");
    var recipe_id = request.params.recipeId;
    var image_id = request.params.imageId;
    api.authPromise(request).then(
        function (user) {
            var user_id = user.id;
            database.query(
                'SELECT author_id from RECIPE \
            where recipe_id = $1', [recipe_id],
                function (err, recipeResult) {
                    if (err) {
                        logger.error(err);
                        return response.status(500).send({
                            error: 'Error getting recipe'
                        });
                    } else {
                        if (recipeResult.rows.length > 0) {
                            var recipe = recipeResult.rows[0];
                            if (user_id !== recipe.author_id) {
                                return response.status(401).send({
                                    error: 'You do not have permissions!!'
                                });
                            } else {
                                const params = {
                                    Bucket: S3_BUCKET_NAME,
                                    Key: "images/" + image_id
                                };
                                database.query('DELETE FROM IMAGES WHERE id = $1 ', [image_id], function (err, result) {
                                    if (err) {
                                        logger.error(err);
                                        return response.status(500).send({
                                            error: 'Error deleting the file from DB'
                                        });
                                    }
                                    s3.deleteObject(params, function (err, data) {
                                        if (err) {
                                            console.log(err);
                                            return response.status(500).send({

                                                error: 'Error deleting the file from storage system'
                                            });
                                        }
                                        console.log('File deleted successfully.');
                                        console.log("Going to delete recipe_id");
                                        redis.del(recipe_id);
                                        console.log("deleted recipe_id");
                                        database.query(
                                            'SELECT recipe_id, created_ts, updated_ts, author_id, cook_time_in_min, prep_time_in_min, total_time_in_min, title, cusine, servings, ingredients from RECIPE \
                                where recipe_id = $1', [recipe_id],
                                            function (err, recipeResult) {
                                                if (err) {
                                                    logger.error(err);
                                                    return response.status(500).send({
                                                        error: 'Error getting recipe'
                                                    });
                                                } else {
                                                    if (recipeResult.rows.length > 0) {
                                                        recipeResult.rows[0].ingredients = JSON.parse(recipeResult.rows[0].ingredients);
                                                        database.query("select position, instruction from orderedlist where recipe_id = $1", [recipeResult.rows[0].recipe_id], function (err, resultSteps) {
                                                            if (err) {
                                                                logger.error(err);
                                                                return response.status(500).send({
                                                                    error: 'Error getting recipe'
                                                                });
                                                            } else {
                                                                database.query("select calories, cholesterol_in_mg, sodium_in_mg, carbohydrates_in_grams, protein_in_grams from nutrition where recipe_id = $1", [recipeResult.rows[0].recipe_id], function (err, resultNutrition) {
                                                                    if (err) {
                                                                        logger.error(err);
                                                                        return response.status(500).send({
                                                                            error: 'Error getting recipe'
                                                                        });
                                                                    } else {
                                                                        database.query("select id,url from images where recipe_id = $1", [recipeResult.rows[0].recipe_id], function (err, imageResult) {
                                                                            if (err) {
                                                                                logger.error(err);
                                                                                return response.status(500).send({
                                                                                    error: 'Error getting images data'
                                                                                });
                                                                            }
                                                                            let redis_json = {
                                                                                image: imageResult.rows,
                                                                                info: recipeResult.rows[0],
                                                                                steps: resultSteps.rows,
                                                                                nutrition_information: resultNutrition.rows[0]
                                                                            }
                                                                            console.log("got the data");
                                                                            const final_result = JSON.stringify(redis_json);
                                                                            redis.set(recipe_id, final_result, "EX", 600);
                                                                            return response.status(204).end();

                                                                        })

                                                                    }
                                                                });
                                                            }
                                                        });
                                                    } else {
                                                        return response.status(404).send({
                                                            error: 'Recipe does not exist!'
                                                        });
                                                    }
                                                }
                                            });





                                    });
                                });

                            }
                        } else {
                            return response.status(404).send({
                                error: 'Recipe does not exist'
                            });
                        }
                    }
                });
        },
        function (err) {
            logger.error(err);
            response.status(401).send(err);
        }
    );
}


module.exports = {
    getImage,
    uploadImage,
    deleteImage
}