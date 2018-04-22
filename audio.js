var Music = [
    "Audio/Exciting Trailer.mp3",
    "Audio/Gregorian Chant.mp3",
    "Audio/Iron Bacon.mp3",
    "Audio/Meatball Parade.mp3",
    "Audio/Mega Hyper Ultrastorm.mp3",
    "Audio/Motherlode.mp3",
    "Audio/Pump.mp3"
];

var SongNames = [
    "Exciting Trailer",
    "Gregorian Chant",
    "Iron Bacon",
    "Meatball Parade",
    "Mega Hyper Ultrastorm",
    "Motherlode",
    "Pump",
]

var audioContext;
var loadedMusic = new Map();

try {
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    audioContext = new AudioContext();
}
catch(e) {
    alert('Web Audio API is not supported in this browser');
}

//
// setTimeout(() => {
//     GetMusic(Music[0], data => {
//         PlaySound(data.buffer)
//     })
// }, 2000)


function musicLoaded(){
    getPeaksAtThreshold(loadedMusic, 0.95);
    PlaySound(loadedMusic);
}

function getPeaksAtThreshold(data, threshold) {
    // TODO Most of the music is probably sterio, but we'll assume mono temporarily
    console.log(data)
    let channels = []
    for(let ii = 0; ii < data.numberOfChannels; ii++)
        channels.push(data.getChannelData(ii))

    var peaksArray = [];
    var length = data.length;

    var max = 0

    for(var i = 0; i < length; i++) {

        max = Math.max(max, channels[0][i])

        if (channels[0][i] > threshold) {
            peaksArray.push(i);
            // Skip forward ~ 1/4s to get past this peak.
            i += 10000;
        }
    }

    console.warn(max)
    return peaksArray;
}

function VolumeSliderChange(event){
    SetVolume($(event.target).val()/1000)
}

function SetVolume(value){
    console.warn("Not setting volume", value)
}

function GetVolume(){
    console.warn("not getting volume")
    return 0.2
}

function GetMusic(url, callback){
    // Load the song from cache if we already loaded it
    if(loadedMusic.has(url)) return loadedMusic.get(url)

    // Prepare to to a resource request
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer'; // force binary data

    // Decode asynchronously
    request.onload = function() {
        audioContext.decodeAudioData(request.response, function(buffer) {
            console.log("Music Loaded");

            musicData = {
                buffer: buffer,
                url: url,
                nodes: getPeaksAtThreshold(buffer, 0.95)
            }

            loadedMusic.set(url, musicData)
            if(callback) callback(musicData)
      });
    }
    request.send();
}

function PlaySound(buffer) {
    var source = audioContext.createBufferSource(); // creates a sound source
    source.buffer = buffer;                    // tell the source which sound to play
    source.connect(audioContext.destination);       // connect the source to the context's destination (the speakers)
    source.start(0);                           // play the source now
                                             // note: on older systems, may have to use deprecated noteOn(time);

    function test(){
        console.debug('audio at', GetCurrentAudioTimestamp())
    }

    setInterval(test, 1000)
}


function GetCurrentAudioTimestamp(){
    return audioContext.getOutputTimestamp().contextTime;
}
