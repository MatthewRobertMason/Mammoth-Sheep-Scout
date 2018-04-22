

var Sprites = new Map([
    ["Graphics/AirDropParachute.png", null]
])


function LoadAllSprites(callback){
    let loader = new THREE.TextureLoader()

    for(let name of Sprites.keys()){
        loader.load(name, texture => {
            Sprites.set(name, texture);
            for(let value of Sprites.values()){
                if(value == null) return
            }
            callback()
        })
    }
}
