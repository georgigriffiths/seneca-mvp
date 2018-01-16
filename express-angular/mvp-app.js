/* Copyright (c) 2013-2015 Richard Rodger, MIT License */
"use strict";

var http = require('http')
var express = require('express')
var cookieparser = require('cookie-parser')
var bodyparser = require('body-parser')
var seneca = require('seneca')({log: 'silent'})
var Passport = require('passport')


seneca.use('options', 'options.mine.js')
      .use('basic')


var options = seneca.export('options')
var app = express()
app.use(cookieparser())
app.use(bodyparser.json())
app.use( function( req, res, next ){
  if( 0 == req.url.indexOf('/reset') ||
      0 == req.url.indexOf('/confirm') ) 
  {
    req.url = '/'
  }
  next()
})
app.use(express.static(__dirname + options.main.public))

seneca.use('web', {
  context: app,
  adapter: require('seneca-web-adapter-express'),
  auth: Passport,
  options: {parseBody: false},
  middleware:[
    function( req, res, next ){
      if( 0 == req.url.indexOf('/reset') ||
          0 == req.url.indexOf('/confirm') ) 
      {
        req.url = '/'
      }
    
      next()
    }
  ]
})

seneca.ready(function (err) {
  if (err) return process.exit(!console.error(err));
  seneca.use('entity')
  seneca.use('mem-store', {web: {dump: false}})
  seneca.use('user',{confirm:true})
  seneca.use('auth')
  //seneca.use('mail')

  // should be sure that seneca-auth is fully loaded
  seneca.ready(function (err) {
    if (err) return process.exit(!console.error(err));
    seneca.use('account')
    // seneca.use('project')
    // seneca.use('settings')
    // seneca.use('data-editor')

    seneca.use('facebook-auth', options.facebook || {})
    seneca.use('google-auth', options.google || {})
    seneca.use('github-auth', options.github || {})
    seneca.use('twitter-auth', options.twitter || {})

    var server = seneca.export('web/context')()

    //seneca.use('admin', {server: server, local: true});

  // should be sure that all plugins are fully loaded before starting server
    seneca.ready(function(){
      loadDefaultData()
      seneca.act('role:settings, cmd:define_spec, kind:user', {spec: options.settings.spec})

      console.log('Listen on ' + options.main.port)
      server.listen(options.main.port)

      seneca.log.info('listen', options.main.port)
      seneca.listen()
    })
  })

  function loadDefaultData(){

    seneca.act({
      role: 'user', cmd:'register', 
      nick: 'u1', name: 'nu1', email: 'u1@example.com', password: 'u1', active: true
    }, function (err, out) {
      seneca.act({
        role: 'project', cmd:'save',
        data: {name: 'p1'}, account: out.user.accounts[0]
      })
      seneca.act({
        role:'settings', cmd:'save', 
        kind:'user', settings:{a:"aaa"}, ref:out.user.id
      })
    })
    seneca.act({
      role: 'user', cmd:'register', 
      nick: 'u2', name: 'nu2', email: 'u2@example.com', password: 'u2', active: true
    })
    seneca.act({
      role: 'user', cmd:'register', 
      nick: 'a1', name: 'na1', email: 'a1@example.com', password: 'a1', active: true, admin: true
    })
  }
})


process.on('uncaughtException', function (err) {
  console.error('uncaughtException:', err.message)
  console.error(err.stack)
  process.exit(1)
})

