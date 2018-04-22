

var Sprites = new Map([
    ["Graphics/AirDropParachute.png", null],
    ["Graphics/GunBase.png", null],
    ["Graphics/GunTurret.png", null],
    ["Graphics/Frame.png", null],
    ["Graphics/City.png", null],
    ["Graphics/Rocket.png", null],
    ["Graphics/Fireball.png", null],
    ["Graphics/AirDropCrate.png", null],
    ["Graphics/City_1.png", null],
    ["Graphics/City_2.png", null],
    ["Graphics/City_Fallen.png", null],
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
