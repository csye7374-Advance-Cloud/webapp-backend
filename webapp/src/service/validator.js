const validator = require("email-validator");
const Regex = require("regex");

class Validator{

    validateEmail(username){
        if(validator.validate(username))
            return true;
        else
            return false;
    }

    validatePassword(password){
        let regex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[^\w\s]).{8,}$/ //Password matching expression.
        // At least one upper case, one lower case, one special character and one digit

        if(regex.test(password))
            return true;
        else
            return false;
    }
}

module.exports = Validator;