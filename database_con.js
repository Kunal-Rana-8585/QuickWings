const { connect } = require('http2');
var mysql = require('mysql');

require('dotenv').config();


var db = mysql.createConnection({
    host: process.env.MYSQL_ADDON_HOST,
    user: process.env.MYSQL_ADDON_USER,
    password: process.env.MYSQL_ADDON_PASSWORD,
    database: process.env.MYSQL_ADDON_DB
});


db.connect(function(err){
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to database');
}); // end of connect function

module.exports=db;