'use strict'
//  OpenShift sample Node application
const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const app = express()

Object.assign = require('object-assign')

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')))

const port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080
const ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0'
let mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL
let mongoURLLabel = ''

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  let mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase()
  let mongoHost = process.env[mongoServiceName + '_SERVICE_HOST']
  let mongoPort = process.env[mongoServiceName + '_SERVICE_PORT']
  let mongoDatabase = process.env[mongoServiceName + '_DATABASE']
  let mongoPassword = process.env[mongoServiceName + '_PASSWORD']
  let mongoUser = process.env[mongoServiceName + '_USER']

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://'
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@'
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase
    mongoURL += mongoHost + ':' + mongoPort + '/' + mongoDatabase
  }
}
let db = null
let dbDetails = {}

let initDb = function (callback) {
  if (mongoURL == null) return

  var mongodb = require('mongodb')
  if (mongodb == null) return

  mongodb.connect(mongoURL, function (err, conn) {
    if (err) {
      callback(err)
      return
    }

    db = conn
    dbDetails.databaseName = db.databaseName
    dbDetails.url = mongoURLLabel
    dbDetails.type = 'MongoDB'

    console.log('Connected to MongoDB at: %s', mongoURL)
  })
}

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function (err) { if (err) console.log(`Error`) })
  }
  if (db) {
    var col = db.collection('counts')
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()})
    col.count(function (err, count) {
      if (err) console.log(`Error`)

      res.render('index', { pageCountMessage: count, dbInfo: dbDetails })
    })
  } else {
    res.render('index', { pageCountMessage: null })
  }
})

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function (err) { if (err) console.log(`Error`) })
  }
  if (db) {
    db.collection('counts').count(function (err, count) {
      if (err) console.log(`Error`)

      res.send('{ pageCount: ' + count + '}')
    })
  } else {
    res.send('{ pageCount: -1 }')
  }
})

// error handling
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something bad happened!')
})

initDb(function (err) {
  console.log(`Error connecting to Mongo. Message:\n${err}`)
})

app.listen(port, ip)
console.log(`Server running on http://${ip}:${port}`)

module.exports = app
