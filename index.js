require('dotenv').config()

const Discord = require('discord.js')
const client = new Discord.Client()

const token = process.env.TOKEN

client.on('ready', () => {
  console.log('Bot online!')
})

client.on('message', msg => {
  if (msg.content === "Hello") {
    msg.reply("Hello Friend!")
  }
})

client.login(token)