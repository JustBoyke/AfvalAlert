const axios = require('axios');
const { Client, DefaultMediaReceiver } = require('castv2-client');
const cron = require('node-cron');
const moment = require('moment');
moment.locale('nl');

const API_KEY = '5ef443e778f41c4f75c69459eea6e6ae0c2d92de729aa0fc61653815fbd6a8ca'; // Vervang dit met de daadwerkelijke API-key
const DEVICE_ADDRESS = '192.168.178.105'; // Vervang dit met het IP-adres van je Google Nest Hub
const VOLUME = 0.8; // 80% volume

async function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

async function fetchWasteCollectionData(dateToCheck) {
  try {
    var todayDate = moment().format('YYYY-MM-DD');
    const response = await axios.get(`https://api.mijnafvalwijzer.nl/webservices/appsinput/?apikey=5ef443e778f41c4f75c69459eea6e6ae0c2d92de729aa0fc61653815fbd6a8ca&method=postcodecheck&postcode=5344ST&street=&huisnummer=3&toevoeging=&app_name=afvalwijzer&platform=phone&afvaldata=${todayDate}&langs=nl`);

    const collectionsOnDate = response.data.ophaaldagen.data.filter(d => d.date === dateToCheck);
    if (collectionsOnDate.length > 0) {
      return collectionsOnDate.map(collect => collect.type).join(' en ');
    }
    return null;
  } catch (error) {
    console.error('Error fetching waste collection data:', error);
    return null;
  }
}

function playTTS(client, originalVolume, message) {
  client.launch(DefaultMediaReceiver, (err, player) => {
    if (err) {
      console.error('Error launching DefaultMediaReceiver:', err);
      client.close();
      return;
    }

    const media = {
      contentId: `http://translate.google.com/translate_tts?ie=UTF-8&tl=nl&client=tw-ob&q=${encodeURIComponent(message)}`,
      contentType: 'audio/mp3',
      streamType: 'BUFFERED',
    };

    player.load(media, { autoplay: true }, (err) => {
      if (err) {
        console.error('Error loading TTS:', err);
      }
      // Set the volume back after a delay
      setTimeout(() => {
        client.setVolume({ level: originalVolume }, (err) => {
          if (err) {
            console.error('Error restoring volume:', err);
          }
          client.close();
        });
      }, 5000); // Adjust delay as needed
    });
  });
}

// Deze cronjob wordt elke dag om 23:00 uur uitgevoerd voor de volgende dag
cron.schedule('0 16 * * *', async () => {
  var tomorrowDate = moment().format('YYYY-MM-DD');
  //transform to moment
  var tomorrow = moment(tomorrowDate, 'YYYY-MM-DD');
  //add 1 day
  tomorrow.add(1, 'days');
  //transform back to string
  tomorrowDate = tomorrow.format('YYYY-MM-DD');
  console.log(tomorrowDate);

  const wasteTypesTomorrow = await fetchWasteCollectionData(tomorrowDate);
  if (wasteTypesTomorrow) {
    const client = new Client();
    client.connect(DEVICE_ADDRESS, () => {
      client.getVolume((err, volume) => {
        if (err) {
          console.error('Error getting volume:', err);
          client.close();
          return;
        }
        const message = `Morgen wordt ${wasteTypesTomorrow} opgehaald, vergeet niet buiten te zetten.`;
        // Set the desired volume before playing the message
        client.setVolume({ level: VOLUME }, () => {
          playTTS(client, volume.level, message);
        });
      });
    });

    client.on('error', (err) => {
      console.error('Error:', err);
      client.close();
    });
  } else {
    console.log('Geen afvalinzameling gepland voor morgen.');
  }
});

// Deze cronjob wordt elke dag om 07:00 uur uitgevoerd voor de huidige dag
cron.schedule('0 7 * * *', async () => {
  const todayDate = moment().format('YYYY-MM-DD');
  const wasteTypesToday = await fetchWasteCollectionData(todayDate);
  if (wasteTypesToday) {
    const client = new Client();
    client.connect(DEVICE_ADDRESS, () => {
      client.getVolume((err, volume) => {
        if (err) {
          console.error('Error getting volume:', err);
          client.close();
          return;
        }
        const message = `Vandaag wordt ${wasteTypesToday} opgehaald, vergeet niet buiten te zetten.`;
        // Set the desired volume before playing the message
        client.setVolume({ level: VOLUME }, () => {
          playTTS(client, volume.level, message);
        });
      });
    });

    client.on('error', (err) => {
      console.error('Error:', err);
      client.close();
    });
  } else {
    console.log('Geen afvalinzameling gepland voor vandaag.');
  }
});

console.log('AfvalAlert service is running...');

function test(){
    const client = new Client();
    client.connect(DEVICE_ADDRESS, () => {
      client.getVolume((err, volume) => {
        if (err) {
          console.error('Error getting volume:', err);
          client.close();
          return;
        }
        const message = `De afvalinzameling wijzer app is nu ingeschakeld`;
        // Set the desired volume before playing the message
        client.setVolume({ level: VOLUME }, () => {
          playTTS(client, volume.level, message);
        });
      });
    });

    client.on('error', (err) => {
      console.error('Error:', err);
      client.close();
    });
}

test();
