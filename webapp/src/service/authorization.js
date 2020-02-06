const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const {
    Client
} = require('pg');

const db = require('../../../../../../Advance Cloud/final/ccwebapp/webapp/src/db');

const database = db.connection;

let checkAccess = (req, res) => {
    let auth = req.headers['authorization'];

    if (!auth) {
        res.status(401).json({ "message": "Please login" });
    } else if (auth) {
        let tmp = auth.split(' ');
        let plain_auth = Buffer.from(tmp[1], 'base64').toString();
        let creds = plain_auth.split(':');
        let username = creds[0];

        let password = creds[1];

        if (username != "" && password != "") {
            database.query(
                `SELECT * from appusers where emailaddress = $1`, [username],
                function (err, result) {
                    if (err) {
                        return res.status(500).send({
                            error: 'Error getting user account'
                        });
                    } else {
                        console.log("Result " + JSON.stringify(result.rows));
                        if (result.rows[0] == null) {
                            return res.status(401).json({
                                message: 'Unauthorized : Invalid emailaddress'
                            })
                        } else {

                            if (bcrypt.compareSync(password, result.rows[0].password)) {
                                const resultJSON = {
                                    emailaddress: result.rows[0].emailaddress,
                                    firstname: result.rows[0].firstname,
                                    lastname: result.rows[0].lastname,
                                    account_created: result.rows[0].account_created,
                                    account_updated: result.rows[0].account_updated

                                };
                                return res.status(200).json(resultJSON);
                            } else {
                                return res.status(401).json({
                                    message: 'Unauthorized : Invalid Password'
                                });
                            }

                        };

                    }
                });
        } else {
            res.status(400).json({
                message: "Please enter all details"
            })
        }
    }
}

module.exports = {
    checkAccess: checkAccess
};