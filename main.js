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
    }
}


class Prize extends MovingThing {
    constructor(params){
        super(params)

        this.trailTime = 3
    }
}


class Rock extends MovingThing {
    constructor(params){
        let start = arg(params, 'start')
        params.x = start.x
        params.y = start.z
        super(params)

        this.end = arg(params, 'end')

        let velocity = this.end.clone()
        velocity.sub(start)
        velocity.normalize()
        velocity.multiplyScalar(0.2)

        this.sprite.material.rotation = -(new THREE.Vector2(velocity.x, velocity.z).angle()) + Math.PI/2
        this.vx = velocity.x;
        this.vy = velocity.z;

        this.trailTime = 0.5
    }
}

class Missile extends MovingThing {
    constructor(params){
        let start = arg(params, 'start')
        params.x = start.x
        params.y = start.z
        super(params)

        this.end = arg(params, 'end')

        let velocity = this.end.clone()
        velocity.sub(start)
        velocity.normalize()
        velocity.multiplyScalar(0.2)

        this.sprite.material.rotation = -(new THREE.Vector2(velocity.x, velocity.z).angle()) - Math.PI/2
        this.vx = velocity.x;
        this.vy = velocity.z;

        this.trail = null
        this.trailTime = 0.1
    }
}

class Game{
    constructor(container){
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
        this.moving = []
        this.cities = []
        this.newCity(0.1, 0.9)
        this.newCity(0.3, 0.9)
        this.newCity(0.7, 0.9)
        this.newCity(0.9, 0.9)

        this.rocks = []
        this.newRock()

        this.prizes = []
        this.newPrize(0.1)

        this.missiles = []
        this.newMissile(0.5, 0.5)

        // Bind events
        this.container.mousemove(this.onMouseMove.bind(this))
        this.container.mousedown(this.onMouseDown.bind(this))
    }

    newCity(x, y){

        // {
        //     let geometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 );
        //     let material = new THREE.MeshNormalMaterial();
        //     let cube = new THREE.Mesh(geometry, material );
        //     cube.position.x = 0.5
        //     cube.position.y = -150
        //     cube.position.z = 0.1
        //     this.scene.add(cube)
        // }

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
            sprite: sprite
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

        let rock = new Missile({
            start: start,
            end: end,
            sprite: sprite,
        })

        this.rocks.push(rock)
        this.moving.push(rock)

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

        this.rocks.push(rock)
        this.moving.push(rock)
    }

    newPrize(x){
        let y = 0
        let graphic = new THREE.TextureLoader().load("Graphics/white.png")
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

        // Check for the missiles reaching the destination


        // Check for metiors hitting

        // Check for supplies in the good zone
        // TODO EXTRA highlight when the key should be pressed

        // Check for supplies hitting cities
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
