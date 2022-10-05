const {options} = require('./public/options/mariaDB')
const knex = require('knex')(options)
const sendProd = require('./helper')
const Contenedor = require('./api')
const Mensajes = require('./apiMensajes')
const { response } = require('express')
const express = require('express')
const routerProductos = require('./routers/productos')
const handlebars = require('express-handlebars')
const { Server: IOServer } = require('socket.io')
const { Server: HttpServer } = require('http')
const fetch = require('node-fetch')
const {normalize, schema} = require('normalizr')
const util = require('util')
const session = require('express-session')
const cookieParser = require('cookie-parser')

const MongoStore = require('connect-mongo')
const advancedOptions = { useNewUrlParser: true, useUniFiedTopology: true }


let test = new Contenedor(knex,"prueba")
let msgManager = new Mensajes(knex, "mensajes")

const app = express()
const httpServer = new HttpServer(app)
const io = new IOServer(httpServer)

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(
  session({
  secret: "secreto",
  resave: true,
  saveUninitialized: true,
})
);

let messages = []
let prod = []
let user

app.use(express.json())
app.use(express.urlencoded({extended: true}))


app.use(express.static('./public'))
app.use('/api/productos-test', routerProductos)
app.get('/', (req, res) => {
  res.sendFile('index.html')
})


app.use(cookieParser())
app.use(session({
  store: MongoStore.create({
    mongoUrl: 'mongodb+srv://elimaq25:3LIZABEth@cluster0.cxssa8p.mongodb.net/?retryWrites=true&w=majority',
    mongoOptions: advancedOptions,
    ttl: 30
  }),
  secret: 'secreto',
  resave: true,
  saveUninitialized: true
}))


/* Server Listen */
const PORT = process.env.PORT || 8080
const server = httpServer.listen(PORT , () => console.log(`servidor en el puerto ${PORT}`))
server.on('error', (error) => console.log(`Error en servidor ${error}`))

app.get("/login", (req, res) => {
  if (req.session["user"]) 
    return res.sendFile(path.resolve("public/index.html"));
    res.sendFile(path.resolve("public/login.html"));
 })
 
 app.get("/deslogeo", (req, res) => {
  //document.getElementById('nameUser').innerHTML = user
  res.sendFile(path.resolve("public/logout.html"));
});

app.post("/login", (req, res) => {
  user = req.body.user;
  console.log(user)
  if(user !== "") {
    req.session["user"] = user;
    res.redirect("/index");
  } 
  else {
    res.sendFile(path.resolve("public/login.html"));
  } 
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
  if (!err) res.redirect("/deslogeo")
  else res.send({status : 'desLogeo Error', error: err})
  })
});

io.on('connection', async (socket) => {
  console.log('se conecto un usuario')
  
  async function getMsgOnConnection()
  {
    let mensajes = []
    mensajes = await msgManager.getMessages()
    return mensajes
  }
    
  messages = await getMsgOnConnection()

  socket.emit('mensajes', messages)
  sendProd(socket)

  async function prodF()
  {
    let preProd = []
    console.log("Antes del await")
    await fetch("http://localhost:8080/api/productos-test").then(respuesta => {return respuesta.text()}).then(plantilla => {
    
    preProd = JSON.parse(plantilla)
    
    return preProd
  })
    return preProd
  }

  prod = await prodF()
  io.sockets.emit('prod', prod);
  
  socket.on('new-message',async (data) => {
    async function agregarMsg(data)
    {
      let author = data
      let texto = data.texto
      author = new schema.Entity('author', {
        nombre: author.nombre,
        apellido: author.apellido,
        edad: author.edad,
        alias: author.alias,
        avatar: author.avatar
      }, {idAttribute: author.mail})
      texto = new schema.Entity('text', {
        texto: texto
      })
      
      function print(objeto) 
      {
        console.log(util.inspect(objeto, false, 24, true))
      }
      const normalizado = normalize(author, texto)
      await print(normalizado)
      let agregado = []
      agregado = await msgManager.addMessage(data)
      return agregado
    }
    await agregarMsg(data)
    async function get()
    {
      let mensajes = []
      mensajes = await msgManager.getMessages()
      return mensajes
    }

    
    messages = await get()


    
    
    io.sockets.emit('messages', messages);
  })

  socket.on('new-prod', async (data) => {
    
    async function agregar(data)
    {
      let agregado = []
      agregado = test.addProd(data)
      return agregado
    }
    
    await agregar(data)

    async function prodF()
    {
      let preProd = []
      console.log("Antes del await")
      preProd = await test.getAll()
      return preProd
    }

    prod = await prodF()
    io.sockets.emit('prod', prod);
  })


})