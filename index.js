require('dotenv').config()
var express = require('express')
var app = express()
const axios = require('axios');
const rateLimit = require('axios-rate-limit');

const PORT = Number(process.env.PORT) || 8080
const FWB_REACTION_ID = '754425061229854882'
const BASE_URL = 'https://discord.com/api'
const CHANNEL_ID = '749443579499511860'
const MESSAGE_LIMIT = 100 // the api max is 100
const TOKEN = process.env.TOKEN
const LOOKBACK = 7 * (24 * 60 * 60 * 100) // 1 week lookback

function processResponse(start, lookback, userCounts, data) {
  let returnData = { shouldContinue: false, counts: userCounts }
  // go through all messages
  for (let i = 0; i < data.length; i++) {
    const message = data[i]
    const timestamp = Date.parse(message.timestamp)

    // if we begin to lookback too far, then stop
    if ((start - timestamp) > lookback) {
      console.log("lookback limit reached, no more messages")
      return returnData
    }

    // if time stamp is over a week from current execution then stop processing
    const user = `${message.author.username}#${message.author.discriminator}`

    // no reactions, skip
    if (message.reactions === undefined) {
      continue
    }

    let reactionCount = 0
    const reactions = message.reactions
    for (let j = 0; j < reactions.length; j++) {
      const reaction = reactions[j]
      // skip over anything that is not FWB
      if (reaction.emoji.id !== FWB_REACTION_ID) {
        continue
      }
      reactionCount += reaction.count
    }

    // only add users that have positive reaction count, otherwise aggregate the count
    if (!(user in userCounts) && reactionCount > 0) {
      userCounts[user] = reactionCount
    } else if (user in userCounts) {
      userCounts[user] += reactionCount
    }
  }

  returnData.shouldContinue = true
  return returnData
}

async function main() {

  // iterate through messages as long as there are 100 messages to parse or the time duration is breached
  let lastId = null
  let shouldContinue = false
  let userCounts = {}
  const currentTime = Date.now()

  const instance = rateLimit(axios.create(), { maxRPS: 1 })
  do {
    let params = { limit: MESSAGE_LIMIT }
    if (lastId !== null) {
      params.before = lastId
    }

    try {
      const response = await instance.get(`${BASE_URL}/channels/${CHANNEL_ID}/messages`, {
        headers: {
          'Authorization': `Bot ${TOKEN}`,
        },
        params: params
      })

      const { data } = response
      if (data.length === 0) {
        console.log("reached beginning of chat, no more messages")
        break
      }

      newLastId = data[data.length - 1].id
      lastId = newLastId
      console.log(`processing message ids (${lastId}, ${newLastId})`)
      const processedData = processResponse(currentTime, LOOKBACK, userCounts, data)
      shouldContinue = processedData.shouldContinue
      userCounts = processedData.counts
    } catch (error) {
      if (error.response) {
        console.log(`response error: ${error.response.status}`)
        console.log(error.response.data)
      } else if (error.request) {
        console.log("request error")
      }
    }
  } while (lastId != null && shouldContinue)

  console.log(JSON.stringify(userCounts, null, 2))
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
//   console.log(`App listening on port ${ PORT }`)
// })