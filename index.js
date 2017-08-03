//import {TOKEN_SECRET, SYSTEM_ADMIN} from "secret-config.js";

var express = require('express');
var app = express();
var mysql = require('mysql');
var pug = require('pug');
var bodyParser = require('body-parser');
app.set('view engine', 'pug');
app.use(express.static('public'));
var request = require('request');
const util = require('util');
var jwt    = require('jsonwebtoken');
var config = require('./secret-config.js')
var user_config = require('./users.js')

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var connection = mysql.createConnection({
  host     : '127.0.0.1',
  user     : 'root',
  database : 'pcya'
});
connection.connect(function(err){
	if(err) console.log(err);
	else console.log("Conectado a base de datos");
});

app.get("/propiedades", function(req,res){
  connection.query("Select LEGAJO, NOMBRE_INM, OPERACION, OFER_REQUE, FECHA from legajos LIMIT 10", function (err,result,fields){
    if (err) throw err;
    res.send(result);
  });
  
});
app.get("/propiedades/:legajo", function(req,res){
  connection.query("Select LEGAJO, NOMBRE_INM, OPERACION, OFER_REQUE, FECHA from legajos WHERE LEGAJO='"+ req.params.legajo+"' LIMIT 10", function (err,result,fields){
    if (err) throw err;
    res.send(result);
  });
  
});
app.get("/estadisticas", function(req,res){
  connection.query("SELECT count(*) Total, sum(TIPO_INMU = 'CA') CA, sum(TIPO_INMU = 'CQ') CQ, sum(TIPO_INMU = 'CC') CC, sum(TIPO_INMU = 'TU') TU, sum(TIPO_INMU = 'OT') OT,sum(TIPO_INMU = 'DE') DE, sum(TIPO_INMU = 'TC') TC, sum(TIPO_INMU = 'VU') VU, sum(TIPO_INMU = 'OF') OF, sum(TIPO_INMU = 'FA') FA, sum(TIPO_INMU = 'LO') LO  FROM legajos;", function (err,result,fields){
    if (err) throw err;
    resultobj = result[0];
    datos = [[],[]];
    for(var property in resultobj) {
      if (property != "Total") {
        datos[0].push(100*resultobj[property]/resultobj["Total"]);
        datos[1].push(property);
      }
    }
    res.send(datos);
  });
});

app.post("/api/user/new", function(req,res){
  if(req.body.user.privileges==user_config.PRIVILEGES.PRIV_ALL) {
    connection.query("Select * from usuarios", function (err,result,fields){
      if (err) throw err;
      same_name_user = result.filter(function(user){ return user.username === req.body.new_user.username });
      if (same_name_user.length != 0){
        res.json({
          success: false,
          message: 'Existing username'
        });
      }
      else {
        connection.query("INSERT INTO usuarios VALUES ('"+req.body.new_user.username+"','"+req.body.new_user.password+"','"+req.body.new_user.privileges+"','"+req.body.new_user.alias+"')", function (err,result,fields){
          if (err) throw err;
          res.json({
            success: true,
            message: 'User created'
          });
        });
      }
    });
  }
  else {
    res.json({
      success : false,
      message : "Privilege error"
    });
  }
});

app.put("/api/user/new", function(req,res){
  if(req.body.user.privileges==user_config.PRIVILEGES.PRIV_ALL) {
        connection.query("UPDATE usuarios SET privileges='"+req.body.new_user.privileges+"' WHERE username='"+req.body.new_user.username+"'", function (err,result,fields){
          if (err) throw err;
          res.json({
            success: true,
            message: 'User privileges updated'
          });
        });
  }
  else {
    res.json({
      success : false,
      message : "Privilege error"
    });
  }
});

app.post("/api/user", function(req,res){
  connection.query("Select * from usuarios", function (err,result,fields){
    if (err) throw err;
    user = result.filter(function(user){ return user.username === req.body.username });
    if (user.length== 0) {
        res.json({
          success : false,
          message : "Invalid username"
      });
    }
    else if (user[0].password != req.body.password) {
      res.json({
          success : false,
          message : "Invalid password"
      });
    }
    else {
      var token = jwt.sign({
      user : user[0].username,
    }, config.TOKEN_SECRET);
    res.json({
          success: true,
          message: 'Logged In',
          user : user[0],
          token: token
        });
    }
  });
});

app.get("/api/user", function(req,res){
    connection.query("Select username,privileges,alias from usuarios", function (err,result,fields){
      if (err) throw err;
      res.json({
        success: true,
        users : result
      });
    });
});

app.listen(3002, function () {
  console.log("Listening port "+3001);
});