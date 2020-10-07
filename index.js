require('dotenv').config()
var express = require('express')
var app = express()
const axios = require('axios');
const PORT = Number(process.env.PORT) || 8080

const FWB_REACTION_ID = '754425061229854882'
const BASE_URL = 'https://discord.com/api'
const CHANNEL_ID = '749443579499511860'
const MESSAGE_LIMIT = 100 // the api max is 100
const TOKEN = process.env.TOKEN

function processResponse(userCounts, data) {
  // map FWB counts to user
  data.forEach(message => {
    const timestamp = message.timestamp

    // if time stamp is over a week from current execution then stop processing
    const user = `${message.author.username}#${message.author.discriminator}`

    if (message.reactions === undefined) {
      return
    }

    let reactionCount = 0
    const reactions = message.reactions
    reactions.forEach(reaction => {
      // skip over anything that is not FWB
      if (reaction.emoji.id !== FWB_REACTION_ID) {
        return
      }
      reactionCount += reaction.count
    })

    // only add users that have positive reaction count, otherwise aggregate the count
    if (!(user in userCounts) && reactionCount > 0) {
      userCounts[user] = reactionCount
    } else if (user in userCounts) {
      userCounts[user] += reactionCount
    }
  })

  return userCounts
}

async function main() {

  // iterate through messages as long as there are 100 messages to parse or the time duration is breached
  let lastId = null
  let userCounts = {}

  do {
    let params = { limit: MESSAGE_LIMIT }
    if (lastId !== null) {
      params.before = lastId
    }

    const response = await axios.get(`${BASE_URL}/channels/${CHANNEL_ID}/messages`, {
      headers: {
        'Authorization': `Bot ${TOKEN}`,
      },
      params: params
    })
    const { data } = response
    userCounts = processResponse(userCounts, data)

    // obtain last message ID
    const nextId = data[data.length - 1].id
    if (nextId == lastId) {
      console.log("no more messages")
      break
    }
    lastId = nextId
    console.log(lastId)
  } while (lastId !== null)

  console.log(userCounts)
}

main().catch((e) => {
  console.error(e)
  process.exit()
})

// app.get('/', async (req, res) => {
  // go through each message
  // grab the timestamp, make sure timestamp is within a week
  // grab the username 
  // if there are reactions, grab the reactions for FWB and append to the count for a user
  //if a user doesn't exist, then create it and add the value

//   res.send(data)
// })

// app.listen(PORT, () => {
//   console.log(`App listening on port ${PORT}`)
// })