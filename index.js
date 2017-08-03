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
  database : 'pcya',
  multipleStatements: true,
});

connection.connect(function(err){
	if(err) console.log(err);
	else {
    console.log("Conectado a base de datos");
    connection.query("select (SELECT group_concat(DISTINCT TRADER) FROM legajos) as TRADER, (SELECT group_concat(DISTINCT PRODUCT_O) FROM legajos) as PRODUCT_O,(SELECT group_concat(DISTINCT PRODUCT_R) FROM legajos) as PRODUCT_R,(SELECT group_concat(DISTINCT TRADER) FROM legajos) as TRADER, (SELECT group_concat(DISTINCT ZONA) FROM legajos) as ZONA, (SELECT group_concat(DISTINCT TIPO_INMU) FROM legajos) as TIPO_INMU,(SELECT group_concat(DISTINCT PAIS) FROM legajos) as PAIS,(SELECT group_concat(DISTINCT ESTADO) FROM legajos) as ESTADO", function (err,result,fields){
      if (err) throw err;
      campos = result;
    });
  }
});

var campos = []

app.get("/propiedades", function(req,res){
  connection.query("Select LEGAJO, NOMBRE_INM, OPERACION, OFER_REQUE, FECHA from legajos LIMIT 10", function (err,result,fields){
    if (err) throw err;
    res.send(result);
  });
});

app.get("/api/fields", function(req,res){
    res.send(campos);
});

app.get("/propiedades/:legajo", function(req,res){
  connection.query("Select LEGAJO, NOMBRE_INM, OPERACION, OFER_REQUE, FECHA from legajos WHERE LEGAJO='"+ req.params.legajo+"' LIMIT 10", function (err,result,fields){
    if (err) throw err;
    res.send(result);
  });
});

app.get("/api/estadisticas", function(req,res){
  connection.query("select TIPO_INMU COD, COUNT(TIPO_INMU) TOT from legajos GROUP BY TIPO_INMU; select PRODUCT_O COD, COUNT(PRODUCT_O) TOT from legajos GROUP BY PRODUCT_O; select PRODUCT_R COD, COUNT(PRODUCT_R) TOT from legajos GROUP BY PRODUCT_R; select TRADER COD, COUNT(TRADER) TOT from legajos GROUP BY TRADER", function (err,result,fields){
    if (err) throw err;
    
    tipo_inmu = result [0];
    productores_o = result[1];
    productores_r = result[2];
    traders = result[3];
    var max_array_size = Math.max(productores_o.length, productores_r.length, traders.length);
    var estadisticas = {
      TIPO_INMU : [[],[]],
      PRODUCTORES : [new Array(max_array_size),new Array(max_array_size),new Array(max_array_size),new Array(max_array_size)]
    }
    var name = "";
    for (var i in tipo_inmu) {
      if (tipo_inmu[i].COD != ""){
        estadisticas.TIPO_INMU[1].push(tipo_inmu[i].TOT)
        estadisticas.TIPO_INMU[0].push(tipo_inmu[i].COD)
      } 
    }
    for (var i in productores_o) {
      if (productores_o[i].COD != ""){
        name = productores_o[i].COD;
      }
      else {
        name = "None"
      }
      estadisticas.PRODUCTORES[0][i] = name;
      estadisticas.PRODUCTORES[1][i] = productores_o[i].TOT;
    }
    for (var i in productores_r) {
      if (productores_r[i].COD != ""){
        name = productores_r[i].COD;
      }
      else {
        name = "None"
      }
      if(estadisticas.PRODUCTORES[0].indexOf(name)<0){
        estadisticas.PRODUCTORES[0].push(name)
        estadisticas.PRODUCTORES[1].push(0)
      }
      estadisticas.PRODUCTORES[2][estadisticas.PRODUCTORES[0].indexOf(name)] = productores_r[i].TOT;
    }
    for (var i in traders) {
      if (traders[i].COD != ""){
         name = traders[i].COD;
      }
      else {
        name = "None";
      }
      if(estadisticas.PRODUCTORES[0].indexOf(name)<0){
        estadisticas.PRODUCTORES[0].push(name)
        estadisticas.PRODUCTORES[1].push(0)
        estadisticas.PRODUCTORES[2].push(0)
      }
      estadisticas.PRODUCTORES[3][estadisticas.PRODUCTORES[0].indexOf(name)] = traders[i].TOT
    }
    res.send(estadisticas);
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