const express = require('express')
const routerProductos = express.Router()
const faker = require('faker')
faker.locale = 'es'
const {vehicle, random, image} = faker 

let elemento = {}
let datos = []


function productosRandom()
{
    elemento = {}
    elemento.name = vehicle.manufacturer()
    elemento.price = random.float({max: 1000000})
    elemento.thumbnail = image.transport(640,480,true)
    return elemento
}

routerProductos.get('/', async (req, res) => {   
    datos = []

    for(let i = 0; i < 5; i++)
    {
        datos.push(productosRandom())
    }
    let prod = datos
    res.send(prod)
})

module.exports = routerProductos