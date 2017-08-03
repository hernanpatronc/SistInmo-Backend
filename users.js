module.exports = class User {  
    constructor(username, password, privileges, alias){
        this.username = username;
        this.password = password;
        this.privileges = privileges;
        this.alias = alias;
    }
   
};

module.exports = {
    PRIVILEGES : {
        PRIV_ALL : -1,
        PRIV_READ : 0,
        PRIV_RW : 1
    }
};