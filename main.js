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

function distance(a, b){
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
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
        this.distance = 0
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

    stop(game){
        game.scene.remove(this.sprite)
        if(this.trail){
            for(let obj of this.trail){
                game.scene.remove(obj)
            }
        }
    }

    update(game, delta){
        if(this.trail){
            // if we are leading a new trailing sprite  create it
            this.trailSkipCounter = (this.trailSkipCounter + 1) % this.trailFrameSkip
            if(this.trailSkipCounter == 0 || this.trailSkipCounter != this.trailSkipCounter) {
                let ob = this.sprite.clone();
                ob.material = ob.material.clone()
                ob.material.transparent = true
                this.trail.push(ob)
                game.scene.add(ob)
            }

            // Fade the trail sprites
            for(let sprite of this.trail){
                sprite.position.y -= 0.001
                sprite.material.opacity -= delta / this.trailTime
            }

            // Remove extra trail sprites
            while(this.trail.length > this.trailMax || (this.trail.length > 0 && this.trail[0].material.opacity <= 0)){
                let ob = this.trail.shift()
                game.scene.remove(ob)
            }
        }

        // update the actual position
        this.x += this.vx * delta
        this.y += this.vy * delta
        this.distance += Math.sqrt(Math.pow(this.vx * delta, 2) + Math.pow(this.vy * delta, 2))
    }
}


class Prize extends MovingThing {
    constructor(params){
        super(params)
        this.index = arg(params, 'index')
        this.trail = null
    }
}

class Targeted extends MovingThing {
    constructor(params){
        let start = arg(params, 'start')
        params.x = start.x
        params.y = start.z
        super(params)

        this.end = arg(params, 'end')

        let velocity = this.end.clone()
        velocity.sub(start)
        this.goalDistance = velocity.length()
        velocity.normalize()
        velocity.multiplyScalar(0.2)

        this.sprite.material.rotation = -(new THREE.Vector2(velocity.x, velocity.z).angle()) + arg(params, 'rotation', 0)
        this.vx = velocity.x;
        this.vy = velocity.z;
    }

    get done(){
        return this.distance > this.goalDistance
    }
}

class Rock extends Targeted {
    constructor(params){
        params.rotation = Math.PI/2
        super(params)
        this.trailTime = 0.5
    }
}

class Missile extends Targeted {
    constructor(params){
        params.rotation = -Math.PI/2
        super(params)
        this.trail = null
        this.trailTime = 0.1
    }
}

class Game{
    constructor(container){
        this.hitZone = 0.08

        // Initialize the graphics library
        this.aspect = 1
        this.width = 800;
        this.height = this.width/this.aspect;

        this.container = container;
        this.container.css({
            position: 'absolute',
            top: 0,
            left: 0,
            width: this.width + 'px',
            height: this.height + 'px'
        })

        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        this.renderer.setSize(this.width, this.height);
        this.container.append(this.renderer.domElement)

        this.scene = new THREE.Scene();

        this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1100);
        this.camera.position.x = 0.5
        this.camera.position.y = 5
        this.camera.position.z = 0.5
        this.camera.lookAt(new THREE.Vector3(0.5, 0, 0.5))
        //this.camera.updateProjectionMatrix()
        this.scene.add(this.camera);

        // Add light
        var ambientLight = new THREE.AmbientLight( 0xeeeeee );
        this.scene.add(ambientLight);

        // Add grid while developing
        var gridHelper = new THREE.GridHelper(2, 20);
        gridHelper.position.x = 0.5
        gridHelper.position.z = 0.5
        gridHelper.position.y = -1
        this.scene.add(gridHelper);

        // Add the cannon
        {
            let graphic = new THREE.TextureLoader().load("Graphics/GunBase.png")
            let material = new THREE.SpriteMaterial({map: graphic, color: 0xffffff});
            let sprite = new THREE.Sprite(material)
            this.scene.add(sprite)
            sprite.center.y = 0
            sprite.position.x = 0.5
            sprite.position.y = 0.5
            sprite.position.z = 0.9
            sprite.scale.x = 1/10
            sprite.scale.y = 1/10
        }
        {
            let graphic = new THREE.TextureLoader().load("Graphics/GunTurret.png")
            let material = new THREE.SpriteMaterial({map: graphic, color: 0xffffff});
            let sprite = new THREE.Sprite(material)
            this.scene.add(sprite)
            sprite.position.x = 0.5
            sprite.position.y = 0.51
            sprite.position.z = 0.85
            sprite.scale.x = 1/10
            sprite.scale.y = 1/10
            this.cannon = sprite
        }
        this.mouse = new THREE.Vector2(0.5, 0.5)

        // Add the game objects
        this.cities = []
        this.moving = new Set()
        this.newCity(0.1, 0.9)
        this.newCity(0.3, 0.9)
        this.newCity(0.7, 0.9)
        this.newCity(0.9, 0.9)

        this.rocks = new Set()
        this.newRock()

        this.prizes = new Set()
        this.newPrize(0)

        this.missiles = new Set()

        // Bind events
        this.container.mousemove(this.onMouseMove.bind(this))
        this.container.mousedown(this.onMouseDown.bind(this))
    }

    newCity(x, y){

        let zone_graphic = new THREE.TextureLoader().load("Graphics/Frame.png")
        let zone_material = new THREE.SpriteMaterial({map: zone_graphic, color: 0xFFAAAA});
        let zone = new THREE.Sprite(zone_material)
        this.scene.add(zone)
        zone.center.y = 0
        zone.position.x = x
        zone.position.y = -0.9
        zone.position.z = y - 0.12
        zone.scale.x = 1/20
        zone.scale.y = this.hitZone


        let graphic = new THREE.TextureLoader().load("Graphics/City.png")
        let material = new THREE.SpriteMaterial({map: graphic, color: 0xffffff});
        let sprite = new THREE.Sprite(material)
        this.scene.add(sprite)
        sprite.center.y = 0
        sprite.position.x = x
        sprite.position.y = 0.1
        sprite.position.z = y
        sprite.scale.x = 1/10
        sprite.scale.y = 1/10

        this.cities.push({
            x: x,
            y: y,
            sprite: sprite,
            zone: zone
        })
    }

    cannonDirection(){
        let pointer = this.mouse.clone()
        pointer.x -= this.cannon.position.x;
        pointer.y -= this.cannon.position.z;
        pointer.normalize()
        return pointer
    }

    newMissile(x, y){

        let direction = this.cannonDirection()
        direction.normalize()

        let start = this.cannon.position.clone()
        start.x += direction.x * 0.04
        start.y = 0
        start.z += direction.y * 0.04
        let end = new THREE.Vector3(x, 0, y)

        let graphic = new THREE.TextureLoader().load("Graphics/Rocket.png")
        let material = new THREE.SpriteMaterial({map: graphic, color: 0xffffff});
        let sprite = new THREE.Sprite(material)
        this.scene.add(sprite)
        sprite.position.copy(start)
        sprite.scale.x = 1/40
        sprite.scale.y = 1/40

        let rocket = new Missile({
            start: start,
            end: end,
            sprite: sprite,
        })

        this.missiles.add(rocket)
        this.moving.add(rocket)

    }

    newRock(){

        let depth = 0.11

        if(Math.random() < 0){
            var start = new THREE.Vector3(
                Math.random() < 0.5 ? 0 : 1,
                depth,
                Math.random() * 0.5
            );
        } else {
            var start = new THREE.Vector3(
                Math.random(),
                depth,
                0
            );
        }

        var end = new THREE.Vector3(Math.random(), depth, 1)


        let graphic = new THREE.TextureLoader().load("Graphics/Fireball.png")
        let material = new THREE.SpriteMaterial({map: graphic, color: 0xffffff});
        let sprite = new THREE.Sprite(material)
        this.scene.add(sprite)
        sprite.position.copy(start)
        sprite.scale.x = 1/20
        sprite.scale.y = 1/20

        let rock = new Rock({
            start: start,
            end: end,
            sprite: sprite,
        })

        this.rocks.add(rock)
        this.moving.add(rock)
    }

    newPrize(index){
        let x = this.cities[index].x
        let y = 0
        let graphic = new THREE.TextureLoader().load("Graphics/AirDropCrate.png")
        let material = new THREE.SpriteMaterial({map: graphic, color: 0xffffff});
        let sprite = new THREE.Sprite(material)
        this.scene.add(sprite)
        sprite.position.x = x
        sprite.position.z = y
        sprite.position.y = 0.9
        sprite.scale.x = 1/20
        sprite.scale.y = 1/20

        let prize = new Prize({
            x: x,
            y: y,
            sprite: sprite,
            index: index,
        })

        this.moving.add(prize)
        this.prizes.add(prize)
    }

    explode(x, y){
        console.warn("Make an explosion")
    }

    hitCity(city){
        console.warn("Something hit a city")
    }

    // Update the game state. delta in ms
    update(delta){
        // Move everything forward
        for(let obj of this.moving){
            obj.update(this, delta)
        }

        // Check for the missiles reaching the destination
        for(let obj of this.missiles){
            if(obj.done){
                obj.stop(this);
                this.explode(obj.x, obj.y)
                this.moving.delete(obj)
                this.missiles.delete(obj);
            }
        }

        // Check for metiors hitting
        for(let obj of this.rocks){
            // Check if hit city with good javascript programming(TM)
            let [offset, city] = this.cities.map(city => [distance(city, obj), city]).reduce((a, b) => (a[0] < b[0] ? a : b))

            if(offset < 0.05){
                obj.stop(this);
                this.hitCity(city);
                this.moving.delete(obj)
                this.rocks.delete(obj);
            }

            // Missed
            else if(obj.done){
                obj.stop(this);
                this.moving.delete(obj)
                this.rocks.delete(obj);
            }
        }

        for(let city of this.cities) city.zone.material.color = new THREE.Color(0xFFAAAA);

        // Check for supplies
        for(let obj of this.prizes){
            // Check for supplies in the good zone
            if(0.78 > obj.y && obj.y > 0.78 - this.hitZone){
                this.cities[obj.index].zone.material.color = new THREE.Color(0xAAFFAA);
            }

            // check for the bad zone
            if(obj.y > 0.8){
                this.hitCity(this.cities[obj.index])
                obj.stop(this)
                this.prizes.delete(obj)
                this.moving.delete(obj)
            }
        }
    }

    onMouseMove(event){
        let x = event.offsetX / this.width
        let y = event.offsetY / this.height

        let mouse = new THREE.Vector2(x, y)
        this.mouse = mouse;
        let pointer = this.cannonDirection()

        this.cannon.material.rotation = -pointer.angle() - Math.PI/2
    }

    onMouseDown(event){
        if(event.button != 0) return;

        let x = event.offsetX / this.width
        let y = event.offsetY / this.height
        this.newMissile(x, y)
    }

    // Draw the current scene. delta in ms
    draw(delta){
        this.renderer.render(this.scene, this.camera)
    }
}
