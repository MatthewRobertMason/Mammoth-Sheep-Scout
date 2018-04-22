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

var audioContext;
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
    let channel = data.getChannelData(0)
    var peaksArray = [];
    var length = data.length;

    for(var i = 0; i < length; i++) {
        if (channel[i] > threshold) {
            peaksArray.push(i);
            // Skip forward ~ 1/4s to get past this peak.
            i += 10000;
        }
    }

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

                musicData = {
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

function PlaySound(buffer) {
    var source = audioContext.createBufferSource(); // creates a sound source
    source.buffer = buffer;                         // tell the source which sound to play
    //source.connect(audioContext.destination);       // connect the source to the context's destination (the speakers)
    source.start(0);                                // play the source now
                                                    // note: on older systems, may have to use deprecated noteOn(time);
    source.connect(audioVolumeNode);
    audioVolumeNode.connect(audioContext.destination);

    function test(){
        console.debug('audio at', GetCurrentAudioTimestamp())
    }

    setInterval(test, 1000)
}

function GetCurrentAudioTimestamp(){
    return audioContext.getOutputTimestamp().contextTime;
}

function analyzeMusic(buffer, callback){
    let high = null
    let low = null;
    let band = null;

    let threshold = 0.95

    function doPeaks(){
        if(!high || !low || ! band) return;
        let lowNodes = getPeaksAtThreshold(low, threshold)
        let highNodes = getPeaksAtThreshold(high, threshold)
        let bandNodes = getPeaksAtThreshold(band, threshold)

        let all = lowNodes.concat(highNodes).concat(bandNodes)
        all.sort()
        callback(all)
    }

    filterMusicData(buffer, 'highpass', data => {high = data; doPeaks()})
    filterMusicData(buffer, 'lowpass', data => {low = data; doPeaks()})
    filterMusicData(buffer, 'bandpass', data => {band = data; doPeaks()})
}

// passtype can be highpass, lowpass, bandpass or others as listed in the API
// but we probably want one of the ones listed
function filterMusicData(buffer, passType, callback)
{
    // Create offline context
    var offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);

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
