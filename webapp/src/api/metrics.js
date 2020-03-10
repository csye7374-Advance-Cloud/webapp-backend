const client = require('prom-client');

var health = new client.Counter({
    name: 'health',
    help: 'health'
});

var recipe_create = new client.Counter({
    name: 'recipe_created',
    help: 'recipe'
});

const recipe_get = new client.Counter({
    name: 'recipe_get',
    help: 'recipe'
});

const recipe_update = new client.Counter({
    name: 'recipe_update',
    help: 'recipe'
});

const recipe_delete = new client.Counter({
    name: 'recipe_delete',
    help: 'recipe'
});

const image_upload = new client.Counter({
    name: 'image_upload',
    help: 'image'
});

const image_get = new client.Counter({
    name: 'image_get',
    help: 'image'
});

const image_delete = new client.Counter({
    name: 'image_delete',
    help: 'image'
});


const user_created = new client.Counter({
    name: 'User_created',
    help: 'user'
});

const user_get = new client.Counter({
    name: 'User_get',
    help: 'user'
});

const user_update = new client.Counter({
    name: 'User_update',
    help: 'user'
});



module.exports = {
    recipe_create, recipe_get, recipe_update, recipe_delete,
    image_upload, image_get, image_delete,
    user_created, user_get, user_update,
    health

};

