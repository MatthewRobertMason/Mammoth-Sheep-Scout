'use strict'

var soundVolume = 0.7

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

function randomIn(a, b){
    return Math.random() * (b - a) + a
}

function randomChoice(array){
    return array[Math.floor(Math.random() * array.length)]
}

class Star {
    constructor (game, scene, x, y){
        let graphic = Sprites.get("Graphics/Star.png")
        let material = new THREE.SpriteMaterial({map: graphic, color: new THREE.Color(1, 1, Math.random())});
        let sprite = new THREE.Sprite(material)
        this.sprite = sprite;
        sprite.position.x = x
        sprite.position.y = -2
        sprite.position.z = y
        let scaleMod = (Math.random() * 0.02) - 0.01
        sprite.scale.x = 0.05 + scaleMod
        sprite.scale.y = 0.05 + scaleMod
        scene.add(sprite)
        this.material = material
    }
    update(game, delta){
        this.material.color.b += (Math.random() * 2 - 1) * 3 * delta
        this.material.color.b = THREE.Math.clamp(this.material.color.b, 0.0, 1.0)
    }
}

class ExplosionEffect{
    constructor(game, x, y, radius){
        this.x = x
        this.y = y;
        this.radius = radius

        this.materials = []
        for(let ii = 0; ii < 10; ii++){
            this.materials[ii] = new THREE.MeshBasicMaterial({color: new THREE.Color(
                Math.random() * 0.5 + 0.5,
                Math.random() * 0.3,
                Math.random() * 0.3
            )})
        }

        let box = new THREE.BoxBufferGeometry(0.005, 0.005, 0.005)

        this.particles = new Set()
        while(this.particles.size < radius * 2000){
            let a = Math.PI * 2 * Math.random()
            let r = Math.random() * radius;
            let material = randomChoice(this.materials)
            let mesh = new THREE.Mesh(box, material)
            game.scene.add(mesh)

            let x = this.x + Math.sin(a) * r
            let y = this.y + Math.cos(a) * r

            mesh.position.x = x
            mesh.position.z = y

            this.particles.add({
                vx: Math.sin(a)/100,
                vy: Math.cos(a)/100,
                sprite: mesh,
            })
        }
    }

    update(game, delta){
        for(let mat of this.materials){
            mat.color.r += (Math.random() * 2 - 1) * delta
            mat.color.g += (Math.random() * 2 - 0.9) * delta
            mat.color.b += (Math.random() * 2 - 1) * delta

            mat.color.r = THREE.Math.clamp(mat.color.r, 0.5, 1)
            mat.color.g = THREE.Math.clamp(mat.color.g, 0.1, 0.5)
            mat.color.b = THREE.Math.clamp(mat.color.b, 0.0, 0.3)
        }

        for(let par of this.particles){
            par.sprite.position.x += delta * ((Math.random() * 2 - 1)/10 + par.vx)
            par.sprite.position.y += delta * ((Math.random() * 2 - 1)/10 + 0)
            par.sprite.position.z += delta * ((Math.random() * 2 - 1)/10 + par.vy)
            par.vy += delta/100
            if(Math.random() < 0.9 * delta){
                game.scene.remove(par.sprite)
                this.particles.delete(par)
            }
        }
    }

    get done(){
        return this.particles.size == 0
    }

    stop(){}
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
                sprite.position.x += (Math.random() * 2 - 1)/20 * delta
                sprite.position.z += (Math.random() * 2 - 1)/20 * delta
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
        this.vy = arg(params, 'speed')
    }

    caught(game){
        game.scene.remove(this.sprite)

        let graphic = new THREE.TextureLoader().load("Graphics/AirDropParachute.png")
        let material = new THREE.SpriteMaterial({map: graphic, color: 0xffffff});
        let sprite = new THREE.Sprite(material)
        this.sprite.position.y = sprite.position.y = 0
        sprite.scale.x = 1/20
        sprite.scale.y = 1/20

        this.sprite.position.x = 0;
        this.sprite.position.z = 0

        let group = new THREE.Group()
        group.add(sprite)
        group.add(this.sprite)

        group.position.x = this.x;
        group.position.z = this.z;

        this.vy /= 3

        game.scene.add(group)
        this.sprite = group
    }

    get done(){
        return this.y > 0.85
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
        velocity.multiplyScalar(arg(params, 'speed', 0.2))

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
        this.trailTime = 0.08
    }
}

class Game{
    constructor(container, audioData, soundsData){
        $('body').css({backgroundColor: '#111111'})
        this.hitZone = 0.08
        this.rockDamage = 0.4
        this.prizeDamage = 0.1
        this.rockRange = [0.3, 4]
        this.rockSpeed = 0.1
        this.missileSpeed = 0.4
        this.explosionRadius = 0.05
        this.rockets = 40
        this.prizeSize = 5
        this.noteSpeed = 0.4
        this.points = {
            catch: 10,
            victory: 1000,
            hitActive: -5,
            hitDead: -1,
            lostCity: -100,
            explodeRock: 3
        }

        this.audioData = audioData
        this.soundsData = soundsData

        console.log(audioData)

        this.score = 0;
        this.running = true;

        // Initialize the graphics library
        this.aspect = 1
        this.timeUntilRock = randomIn(...this.rockRange);
        this.width = 64*10 * 1.5;
        this.height = this.width/this.aspect;

        this.container = container;
        this.container.focus()
        this.container.css({
            position: 'relative',
            // top: 0,
            // left: 0,
            width: this.width + 'px',
            height: this.height + 'px',
            zIndex: 200,
            marginLeft: 'auto',
            marginRight: 'auto',
            width: this.width,
            height: this.height,
        })

        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        this.renderer.setSize(this.width, this.height);
        this.container.append(this.renderer.domElement)
        $(this.renderer.domElement).css({
            position: 'relative',
            top: 0,
            left: 0,
            zIndex: 200,
        })
        this.mouseTargets = [$(this.renderer.domElement)]

        // Add an html element over the game to display rockets
        this.rocketCounter = $('<div>').appendTo(container)
        this.rocketCounter.css({
            padding: '2px',
            textAlign: 'center',
            verticalAlign: 'center',
            position: 'absolute',
            top: this.height - 60,
            left: (this.width - 40)/2,
            width: 40,
            height: 30,
            border: '1px solid #333333',
            zIndex: 300,
            color: 'black',
            backgroundColor: '#77AA77',
        }).html(this.rockets)

        // Add an html element over the game to show a volume control
        let volumeBox = $('<div>').appendTo(container)
        volumeBox.css({
            padding: '2px',
            textAlign: 'center',
            verticalAlign: 'center',
            position: 'absolute',
            top: this.height - 60,
            left: 0,
            width: 200,
            height: 30,
            border: '1px solid #333333',
            zIndex: 300,
            color: 'black',
            backgroundColor: '#77AA77',
        })
        let bar = $("<input id='game-volume' type='range' min='0' max='1000' value='500' onchange='VolumeSliderChange(arguments[0])'>")
        volumeBox.html(bar)
        bar.val(GetVolume()*1000)

        // Add score box
        this.scoreBox = $('<div>').appendTo(container)
        this.scoreBox.css({
            padding: '2px',
            textAlign: 'center',
            verticalAlign: 'center',
            position: 'absolute',
            top: this.height - 60,
            right: 0,
            width: 50,
            height: 30,
            border: '1px solid #333333',
            zIndex: 300,
            color: 'black',
            backgroundColor: '#77AA77',
        }).html(this.score)

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
        // var gridHelper = new THREE.GridHelper(2, 20);
        // gridHelper.position.x = 0.5
        // gridHelper.position.z = 0.5
        // gridHelper.position.y = -1
        // this.scene.add(gridHelper);

        // Add the background
        {
            let graphic = Sprites.get("Graphics/Background.png")
            let material = new THREE.SpriteMaterial({map: graphic, color: 0xffffff});
            let sprite = new THREE.Sprite(material)
            this.scene.add(sprite)
            sprite.center.y = 0
            sprite.position.x = 0.5
            sprite.position.y = -1
            sprite.position.z = 1
            sprite.scale.x = 1
            sprite.scale.y = 1
        }

        // Add the cannon
        {
            let graphic = Sprites.get("Graphics/GunBase.png")
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
            let graphic = Sprites.get("Graphics/GunTurret.png")
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
        this.newCity(1, 0.1, 0.9)
        this.newCity(2, 0.3, 0.9)
        this.newCity(3, 0.7, 0.9)
        this.newCity(4, 0.9, 0.9)

        this.rocks = new Set()
        this.prizes = new Set()
        this.missiles = new Set()
        this.effects = new Set()

        // Bind events
        this.container.mousemove(this.onMouseMove.bind(this))
        this.container.mousedown(this.onMouseDown.bind(this))
        $('body').keydown(this.onKeyDown.bind(this))

        // Figure out the delay
        // Get the center of the hitbox
        var hitBox = this.getHitBox()
        hitBox = (hitBox[0] + hitBox[1])/2

        // Make sure we copy the notes so the cache isn't changed
        this.notes = [
            JSON.parse(JSON.stringify(this.audioData.nodes.low)),
            JSON.parse(JSON.stringify(this.audioData.nodes.band)),
            JSON.parse(JSON.stringify(this.audioData.nodes.high)),
            JSON.parse(JSON.stringify(this.audioData.nodes.lowshelf)),
            []
        ]

        // Given the velocity, and distance, we know the delay
        console.log("note speed: " + this.noteSpeed)
        console.log(Date.now())
        //console.log(hitBox, this.noteSpeed)
        this.noteDelay = hitBox/this.noteSpeed
        //console.log(this.noteDelay)
        console.log("note delay: " + this.noteDelay)
        this.startTime = audioContext.currentTime + 0.2;
        PlayMusic(this.audioData.buffer, this.startTime)
        this.lastFrameSample = Math.floor((this.noteDelay + 0.2) * this.audioData.buffer.sampleRate)

        console.log(Date.now())

        let randStars = Math.floor((Math.random() * 10) + 15);
        for (let numStar = 0; numStar < randStars; numStar++){
            let star = new Star(this, this.scene, Math.random(), Math.random()/5);
            this.moving.add(star);
        }
    }

    newCity(numeral, x, y){
        this.mouseTargets.push($('<div>').appendTo(this.container).css({
            textAlign: 'center',
            verticalAlign: 'center',
            position: 'absolute',
            top: this.height * (y - 0.115 - 0.5 * this.hitZone),
            left: this.width * x,
            width: 30,
            height: 30,
            transform: 'translate(-50%, -50%)',
            zIndex: 300,
            color: 'white',
            fontWeight: 400,
            fontSize: '25px',
            opacity: 0.7,
            cursor: 'default',
        }).html(numeral).disableSelection())

        let zone_graphic = Sprites.get("Graphics/Frame.png")
        let zone_material = new THREE.SpriteMaterial({map: zone_graphic, color: 0xFFAAAA});
        let zone = new THREE.Sprite(zone_material)
        this.scene.add(zone)
        zone.center.y = 0
        zone.position.x = x
        zone.position.y = -0.9
        zone.position.z = y - 0.12
        zone.scale.x = 1/20
        zone.scale.y = this.hitZone


        let graphic = Sprites.get("Graphics/City.png")
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
            active: true,
            sprite: sprite,
            zone: zone,
            health: 1
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
        if(this.rockets == 0){
            return
        }
        this.rockets--

        let direction = this.cannonDirection()
        direction.normalize()

        let start = this.cannon.position.clone()
        start.x += direction.x * 0.04
        start.y = 0
        start.z += direction.y * 0.04
        let end = new THREE.Vector3(x, 0, y)

        let graphic = Sprites.get("Graphics/Rocket2.png")
        let material = new THREE.SpriteMaterial({map: graphic, color: 0xffffff});
        let sprite = new THREE.Sprite(material)
        this.scene.add(sprite)
        sprite.position.copy(start)
        sprite.scale.x = 1/20
        sprite.scale.y = 1/20

        let rocket = new Missile({
            start: start,
            end: end,
            sprite: sprite,
            speed: this.missileSpeed,
        })

        PlaySound(this.soundsData.get("Sounds/Shot.wav"), soundVolume)
        this.missiles.add(rocket)
        this.moving.add(rocket)

    }

    newRock(){

        let depth = 0.11

        if(Math.random() < 0.5){
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


        let graphic = Sprites.get("Graphics/Fireball.png")
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
            speed: this.rockSpeed,
        })

        this.rocks.add(rock)
        this.moving.add(rock)
    }

    newPrize(index){
        let x = this.cities[index].x
        let y = 0
        let graphic = Sprites.get("Graphics/AirDropCrate.png")
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
            speed: this.noteSpeed
        })

        this.moving.add(prize)
        this.prizes.add(prize)
    }

    explodeGraphic(x, y, radius){
        let exp = new ExplosionEffect(this, x, y, radius);
        this.effects.add(exp)
        this.moving.add(exp)
    }

    explode(x, y){
        this.explodeGraphic(x, y, this.explosionRadius)
        PlaySound(this.soundsData.get("Sounds/Explosion.wav"), soundVolume)

        let p = {x: x, y: y}
        // Get the prizes in the radius
        for(let prize of this.prizes){
            if(distance(p, prize) < this.explosionRadius){
                prize.stop(this)
                this.moving.delete(prize)
                this.prizes.delete(prize)
            }
        }

        // Get the rocks in the radius
        for(let rock of this.rocks){
            if(distance(p, rock) < this.explosionRadius){
                rock.stop(this)
                this.moving.delete(rock)
                this.rocks.delete(rock)
                this.score += this.points.explodeRock
            }
        }
    }

    hitCity(city, damage, spot){
        this.explodeGraphic(spot.x, spot.y, 0.015)


        if(city.health <= 0){
            this.score += this.points.hitDead
            return
        }
        this.score += this.points.hitActive
        let before = city.health
        city.health -= damage

        if(before > 0.66 && city.health <= 0.66){
            city.sprite.material.map = Sprites.get("Graphics/City_1.png")
            PlaySound(this.soundsData.get("Sounds/CityExplosion.wav"), soundVolume)
        }

        if(before > 0.33 && city.health <= 0.33){
            city.sprite.material.map = Sprites.get("Graphics/City_2.png")
            PlaySound(this.soundsData.get("Sounds/CityExplosion.wav"), soundVolume)
        }

        if(city.health <= 0){
            this.score += this.points.lostCity
            city.active = false
            city.sprite.material.map = Sprites.get("Graphics/City_Fallen.png")
            PlaySound(this.soundsData.get("Sounds/CityExplosion.wav"), soundVolume)
        }
    }

    getHitBox(){
        let off = ((26/32)/(20*2))
        return [0.78 - off, 0.78 - this.hitZone - off]
    }

    inHitBox(obj){
        let [high, low] = this.getHitBox()
        return high > obj.y && obj.y > low
    }

    // Update the game state. delta in seconds
    update(delta){
        if(!this.running) return

        // Figure out how far into the song we are
        let timeInSong = audioContext.currentTime - this.startTime
        if(timeInSong > 0){
            let samplesInSong = Math.floor((this.noteDelay + timeInSong) * this.audioData.buffer.sampleRate)
            for(let index = 0; index < 4; index++){
                let foundNote = false
                let notes = this.notes[index]
                while(notes[0] < this.lastFrameSample) notes.shift()
                while(notes[0] < samplesInSong){
                    foundNote = true
                    notes.shift()
                }
                if(foundNote) this.newPrize(index)
            }
            this.lastFrameSample = samplesInSong
        }

        // Check for lose
        var notLost = false
        for(let city of this.cities){
            notLost |= city.active
        }
        if(!notLost) this.finished(false)

        // Check for win
        if(timeInSong > this.audioData.buffer.duration + 2){
            this.finished(true)
        }

        // Drop rocks
        this.timeUntilRock -= delta
        if(this.timeUntilRock < 0){
            this.newRock()
            this.timeUntilRock = randomIn(...this.rockRange)
        }

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
                this.hitCity(city, this.rockDamage, obj);
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
            if(this.inHitBox(obj)){
                this.cities[obj.index].zone.material.color = new THREE.Color(0xAAFFAA);
            }

            // check for the bad zone
            if(obj.y > 0.8){
                this.hitCity(this.cities[obj.index], this.prizeDamage, obj)
                obj.stop(this)
                this.prizes.delete(obj)
                this.moving.delete(obj)
            }
        }

        for(let obj of this.effects){
            if(obj.done){
                obj.stop(this)
                this.effects.delete(obj)
                this.moving.delete(obj)
            }
        }
    }

    onMouseMove(event){
        if(!this.running) return

        let off = this.container.offset()
        let x = (event.pageX - off.left) / this.width
        let y = (event.pageY - off.top) / this.height

        let mouse = new THREE.Vector2(x, y)
        this.mouse = mouse;
        let pointer = this.cannonDirection()

        this.cannon.material.rotation = -pointer.angle() - Math.PI/2
    }

    onMouseDown(event){
        if(!this.mouseTargets.map(t => t.is($(event.target))).reduce((a, b) => (a || b))) return;
        if(event.button != 0) return;
        if(!this.running) return

        let off = this.container.offset()
        let x = (event.pageX - off.left) / this.width
        let y = (event.pageY - off.top) / this.height
        this.newMissile(x, y)
    }

    onKeyDown(event){
        if(!this.running) return
        let key = event.key;
        let index = Number(key) - 1
        if(index == index && 0 <= index && index < this.cities.length){
            if(!this.cities[index].active) return;
            // Look for prizes to trigger
            let found = Array.from(this.prizes).filter(prize => (prize.index == index && this.inHitBox(prize)))
            if(found.length == 0){
                this.newRock()
                return
            }

            for(let obj of found){
                this.prizes.delete(obj)
                obj.caught(this)
                this.effects.add(obj)
                this.winPrize(obj)
            }
        }
    }

    // Draw the current scene. delta in ms
    draw(delta){
        this.renderer.render(this.scene, this.camera)
        this.rocketCounter.html(this.rockets)
        this.scoreBox.html(this.score)
    }

    winPrize(obj){
        this.score += this.points.catch
        this.rockets += this.prizeSize
    }

    finished(victory){
        if(!this.running) return;
        if(victory) this.score += this.points.victory;
        this.running = false;
        $('.final_score').html(this.score)

        // Add score to score cookie for this track
        let current = Cookies.getJSON(this.audioData.url) || {victory: '-Infinity', defeat: '-Infinity'}
        if(victory) current.victory = String(Math.max(Number(current.victory), this.score))
        else current.defeat = String(Math.max(Number(current.defeat), this.score))
        Cookies.set(this.audioData.url, current, {expires: 30})

        // Bring up finished splash
        if(victory) $('#victory').show()
        else $('#defeat').show()

        let username = Cookies.get('username')
        if(username && username != ''){
            $.ajax({
              url: 'https://jam-stats.douglass.ca:5000/send',
              jsonp: 'callback',
              dataType: 'jsonp',
              data: {
                  username: username,
                  song: this.audioData.url,
                  difficulty: Cookies.get('difficulty-name'),
                  defeat: String(current.defeat),
                  victory: String(current.victory)
              },
              done: data => console.log("data"),
              fail: error => console.error("error"),
              always: () => console.log("done")
            })
        }
    }
}
