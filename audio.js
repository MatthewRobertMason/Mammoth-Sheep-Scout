'use strict';

var Music = [
    "Audio/Iron Bacon.mp3",
    "Audio/Pump.mp3",
    "Audio/Exciting Trailer.mp3",
    "Audio/Meatball Parade.mp3",
    "Audio/Motherlode.mp3",
    "Audio/Mega Hyper Ultrastorm.mp3",
    "Audio/Gregorian Chant.mp3",
];

var SongNames = [
    "Iron Bacon (120 BPM, 0:55)",
    "Pump (164 BPM, 0:43)",
    "Exciting Trailer (90 BPM, 1:16)",
    "Meatball Parade (150 BPM, 3:25)",
    "Motherlode (90 BPM, 3:57)",
    "Mega Hyper Ultrastorm (220 BPM, 3:13)",
    "Gregorian Chant (? BPM, 3:14)",
]

var Sounds = new Map([
    ["Sounds/Shot.wav", null],
    ["Sounds/Explosion.wav", null],
    ["Sounds/CityExplosion.wav", null],
])

var audioContext;
var bufferLoader;
var audioVolumeNode;
var loadedMusic = new Map();

try {
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    audioContext = new AudioContext();

    audioVolumeNode = audioContext.createGain();
    audioVolumeNode.gain.setValueAtTime(GetVolume(), 0);
    audioVolumeNode.connect(audioContext.destination);
}
catch(e) {
    alert('Web Audio API is not supported in this browser');
}

function getPeaksAtThreshold(data, threshold, desiredValue, desiredThreshold) {
    let left = data.getChannelData(0)
    let right = data.getChannelData(1)
    var peaksArray = [];
    var length = data.length;

    var desiredValueAchieved = false;
    var changeValue = 0.05;

    //threshold *= 2 // instead of dividing the two chanels to average them

    console.log("Get Peaks")
    while (desiredValueAchieved == false)
    {
        peaksArray = []
        threshold *= 2 // instead of dividing the two chanels to average them
        for(var i = 0; i < length; i++) {
            if (left[i] + right[i] > threshold) {
                peaksArray.push(i);
                // Skip forward ~ 1/4s to get past this peak.
                i += 10000;
            }
        }

        console.log("Number of peaks: " + peaksArray.length)

        if ((peaksArray.length > desiredValue * (1-desiredThreshold)) && (peaksArray.length < desiredValue * (1+desiredThreshold))){
            desiredValueAchieved = true
        }
        else
        {
            if (peaksArray.length > desiredValue){
                let ratio = peaksArray.length/desiredValue;
                let tempArray = []

                for(let j = 0; j < peaksArray.length; j+=ratio)
                {
                    tempArray.push(peaksArray[Math.floor(j)])
                }

                peaksArray = tempArray
                desiredValueAchieved = true
            }
            else {
                threshold = (threshold/2 - changeValue)
            }
        }
    }

    console.log("Number of peaks: " + peaksArray.length)
    return peaksArray;
}

function VolumeSliderChange(event){
    SetVolume($(event.target).val()/1000)
}

function SetVolume(value){
    audioVolumeNode.gain.setValueAtTime(value, audioContext.currentTime)
    Cookies.set('volume', value)
}

function GetVolume(){
    let val = Number(Cookies.get('volume'))
    if(val != val) return 0.1; // default to 10% VolumeSliderChange
    return val;
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
        console.log("Music Loaded");
        audioContext.decodeAudioData(request.response, function(buffer) {
            console.log("Music Parsed")
            analyzeMusic(buffer, (data) => {
                console.log("Music Analyzed")

                let musicData = {
                    buffer: buffer,
                    url: url,
                    nodes: data
                }

                loadedMusic.set(url, musicData)
                callback(musicData)
            })
      });
    }
    request.send();
}

function PlayMusic(buffer) {
    var source = audioContext.createBufferSource(); // creates a sound source
    source.buffer = buffer;                         // tell the source which sound to play
    //source.connect(audioContext.destination);     // connect the source to the context's destination (the speakers)
    source.start(0);                                // play the source now
                                                    // note: on older systems, may have to use deprecated noteOn(time);
    source.connect(audioVolumeNode);
    audioVolumeNode.connect(audioContext.destination);

    // function test(){
    //     console.debug('audio at', GetCurrentAudioTimestamp())
    // }
    //
    // setInterval(test, 1000)
}

// function GetCurrentAudioTimestamp(){
//     return audioContext.getOutputTimestamp().contextTime;
// }

function analyzeMusic(buffer, callback, difficultyMultiplier){
    let high = null
    let low = null;
    let band = null;
    let lowshelf = null;

    let threshold = 0.7

    let desiredPeaks = buffer.duration/4 * difficultyMultiplier

    function doPeaks(){
        if(!high || !low || !band|| !lowshelf) return;
        let lowNodes = getPeaksAtThreshold(low, threshold, desiredPeaks, 0.05)
        let highNodes = getPeaksAtThreshold(high, threshold, desiredPeaks, 0.05)
        let bandNodes = getPeaksAtThreshold(band, threshold, desiredPeaks, 0.05)
        let lowshelfNodes = getPeaksAtThreshold(lowshelf, threshold, desiredPeaks, 0.05)

        callback({
            high: highNodes,
            low: lowNodes,
            band: bandNodes,
            lowshelf: lowshelfNodes,
        })
    }

    filterMusicData(buffer, 'highpass', data => {high = data; doPeaks()})
    filterMusicData(buffer, 'lowpass', data => {low = data; doPeaks()})
    filterMusicData(buffer, 'bandpass', data => {band = data; doPeaks()})
    filterMusicData(buffer, 'lowshelf', data => {lowshelf = data; doPeaks()})
}

// passtype can be highpass, lowpass, bandpass or others as listed in the API
// but we probably want one of the ones listed
function filterMusicData(buffer, passType, callback)
{
    // Create offline context
    var offlineContext = new OfflineAudioContext(2, buffer.length, buffer.sampleRate);

    // Create buffer source
    var source = offlineContext.createBufferSource();
    source.buffer = buffer;

    // Create filter
    var filter = offlineContext.createBiquadFilter();
    filter.type = passType;

    // Pipe the song into the filter, and the filter into the offline context
    source.connect(filter);
    filter.connect(offlineContext.destination);

    // Schedule the song to start playing at time:0
    source.start(0);

    // Render the song
    offlineContext.startRendering()

    // Act on the result
    offlineContext.oncomplete = function(e) {
        // Filtered buffer!
        if(callback) callback(e.renderedBuffer)
    };
}

function LoadAllSounds(callback){
    for(let name of Sounds.keys()){
        if(Sounds.get(name) != null) continue

        // Prepare to to a resource request
        let request = new XMLHttpRequest();
        request.open('GET', name, true);
        request.responseType = 'arraybuffer'; // force binary data

        // Decode asynchronously
        request.onload = function() {
            console.log("Sound Loaded");
            console.log(request.response)
            audioContext.decodeAudioData(request.response, function(buffer) {
                console.log("Sound Parsed")
                Sounds.set(name, buffer)
                console.log(Sounds)
                AllSoundsLoaded(callback)
            });
        }

        request.onerror = function(error){
            console.error(error)
        }

        request.send();
    }
    return true
}

function AllSoundsLoaded(callback)
{
    for(let name of Sounds.keys()){
        if (Sounds.get(name) == null){
            return;
        }
    }

    callback(Sounds);
}

function PlaySound(sound, volume) {
    var oneShotSound = audioContext.createBufferSource();
    oneShotSound.buffer = sound;

    // Create a filter, panner, and gain node.
    //var lowpass = audioContext.createLowPass2Filter();
    //var panner = audioContext.createPanner();
    var gainNode2 = audioContext.createGain();
    gainNode2.gain.setValueAtTime(volume, 0);
    // Make connections
    //oneShotSound.connect(lowpass);
    //lowpass.connect(panner);
    //panner.connect(gainNode2);
    oneShotSound.connect(gainNode2);
    gainNode2.connect(audioContext.destination);

    oneShotSound.start(0.0);
}
