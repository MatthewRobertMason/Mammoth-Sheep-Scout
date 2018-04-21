'use strict'

function arg(params, name, value){
    if(!params.hasOwnProperty(name)){
        if(typeof value === 'undefined'){
            throw new Error("Required argument missing: " + name)
        }
        return value
    }
    return params[name]
}


class MovingThing{
    constructor(params){
        this._x = arg(params, 'x')
        this._y = arg(params, 'y')
        this.sprite = arg(params, 'sprite')
        this.vx = 0
        this.vy = 0.1

        this.trailTime = 1
        this.trailMax = 1000
        this.trailSkipCounter = 0
        this.trailFrameSkip = 0
        this.trail = []
    }

    get x(){ return this._x }
    get y(){ return this._y }

    set x(value){
        this._x = value
        this.sprite.position.x = value
    }

    set y(value){
        this._y = value
        this.sprite.position.z = value
    }

    update(game, delta){
        // if we are leading a new trailing sprite  create it
        this.trailSkipCounter = (this.trailSkipCounter + 1) % this.trailFrameSkip
        if(this.trailSkipCounter == 0 || this.trailSkipCounter != this.trailSkipCounter) {
            let ob = this.sprite.clone();
            ob.material = ob.material.clone()
            ob.material.transparent = true
            this.trail.push(ob)
            game.scene.add(ob)
        }

        // update the actual position
        this.x += this.vx * delta
        this.y += this.vy * delta

        // Fade the trail sprites
        for(let sprite of this.trail){
            sprite.position.y -= 0.1
            sprite.material.opacity -= delta / this.trailTime
        }

        // Remove extra trail sprites
        if(this.trail.length > this.trailMax){
            let ob = this.trail.shift()
            game.scene.remove(ob)
        }
    }
}


class Prize extends MovingThing {
    constructor(params){
        super(params)

        this.trailTime = 3
    }
}


const frustumSize = 1;

class Game{
    constructor(container){
        // Initialize the graphics library
        this.width = 1368;
        this.height = 768;
        this.container = container;
        this.container.css({
            position: 'absolute',
            top: 0,
            left: 0,
            width: this.width + 'px',
            height: this.height + 'px'
        })

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(this.width, this.height);
        this.container.append(this.renderer.domElement)

        this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 1, 1100);
        this.camera.position.x = 0.5
        this.camera.position.y = 5
        this.camera.position.z = 0.5
        this.camera.lookAt(new THREE.Vector3(0.5, 0, 0.5))
        this.scene = new THREE.Scene();
        this.scene.add(this.camera);

        var ambientLight = new THREE.AmbientLight( 0xeeeeee );
        this.scene.add(ambientLight);

        var gridHelper = new THREE.GridHelper(1, 10);
        gridHelper.position.x = 0.5
        gridHelper.position.z = 0.5 - 0.1
        gridHelper.position.y = -1000
        this.scene.add(gridHelper);

        // Add the game objects
        this.moving = []
        this.cities = []
        this.newCity(0.8, 0.9)
        this.newCity(0.2, 0.9)

        this.rocks = []
        this.newRock()

        this.prizes = []
        this.newPrize(0.1)

        this.missiles = []
    }

    newCity(x, y){
        let graphic = new THREE.TextureLoader().load("graphics/white.png")
        let material = new THREE.SpriteMaterial({map: graphic, color: 0xffffff});
        let sprite = new THREE.Sprite(material)
        this.scene.add(sprite)
        sprite.position.x = x
        sprite.position.z = y
        sprite.scale.x = 1/10
        sprite.scale.y = 1/10

        this.cities.push({
            x: x,
            y: y,
            sprite: sprite
        })
    }

    newRock(){
        console.warn("Didn't make a rock")
    }

    newPrize(x){
        let y = 0
        let graphic = new THREE.TextureLoader().load("graphics/white.png")
        let material = new THREE.SpriteMaterial({map: graphic, color: 0xffffff});
        let sprite = new THREE.Sprite(material)
        this.scene.add(sprite)
        sprite.position.x = x
        sprite.position.z = y
        sprite.scale.x = 1/20
        sprite.scale.y = 1/20

        let prize = new Prize({
            x: x,
            y: y,
            sprite: sprite
        })

        this.moving.push(prize)
        this.prizes.push(prize)
    }

    // Update the game state. delta in ms
    update(delta){
        // Move everything forward
        for(let obj of this.moving){
            obj.update(this, delta)
        }

        // Check for crashes
    }

    // Draw the current scene. delta in ms
    draw(delta){
        this.renderer.render(this.scene, this.camera)
    }
}
