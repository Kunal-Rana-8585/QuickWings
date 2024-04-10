const { connect } = require('http2');
var mysql = require('mysql');

require('dotenv').config();


var db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});


db.connect(function(err){
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to database');
}); // end of connect function

module.exports=db;