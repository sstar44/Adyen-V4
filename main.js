const morgan  = require('morgan')
const express = require('express')
const app = express()
/*----------  settings  ----------*/

app.set('port',process.env.PORT || 3000)
app.set('json spaces',2)

/*----------  middlewares  ----------*/

app.use(morgan('dev'))
app.use(express.urlencoded({extended: false}))
app.use(express.json())


/*----------  ROUTES  ----------*/

app.use('/adyen', require('./routes/indexad'))
app.use('/adyen', require('./routes/adyen'))
app.use(require('./routes/index'))

/*----------  start server  ----------*/


app.listen(app.get('port'), () => {
	console.log("SERVER ON IN PORT",app.get('port'))
})
