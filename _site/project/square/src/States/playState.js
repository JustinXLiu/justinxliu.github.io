var PlayState = new Kiwi.State('PlayState');

PlayState.create = function () {
    //Create Finger Objects
    //Add To stage
    this.control = Kiwi.Plugins.LEAPController.createController();

    this.fighter = new Fighter(this, 0, 0);
    
    this.enemyGroup = new Kiwi.Group(this);
    this.enemyGroup1 = new Kiwi.Group(this);

    this.timer = this.game.time.clock.createTimer('spawn', .9, -1, true);
    this.timerEvent = this.timer.createTimerEvent(Kiwi.Time.TimerEvent.TIMER_COUNT, this.spawnEnemy, this);

    this.pauseImage = new Kiwi.GameObjects.StaticImage(this, this.textures['pauseImage'], 0, 0);

    this.addChild(this.fighter);
    this.addChild(this.enemyGroup);
    this.addChild(this.enemyGroup1);

    this.addChild(this.pauseImage);
}


PlayState.update = function () {
    Kiwi.State.prototype.update.call(this);

    this.move();
    this.checkCollisions();  
}

PlayState.move = function () {
    if(this.control.controllerConnected){
        this.pauseImage.alpha = 0;

        this.fighter.x = this.control.hands[0].posX + game.stage.width*0.5;
        this.fighter.y = -this.control.hands[0].posY + game.stage.height;
    }else{
        this.pauseImage.alpha = 1;
    } 
}


PlayState.spawnEnemy = function(){

    if(this.control.controllerConnected){
        
        var n = new Enemy(this, Math.floor((Math.random() * game.stage.width) + 1), 0, 1); 
        var e = new Enemy(this, game.stage.width, Math.floor((Math.random() * game.stage.height) + 1), 2); 
        var s = new Enemy(this, Math.floor((Math.random() * game.stage.width) + 1), game.stage.height, 3); 
        var w = new Enemy(this, 0, Math.floor((Math.random() * game.stage.height) + 1), 4); 
        
        this.enemyGroup.addChild(n);
        this.enemyGroup.addChild(e);
        this.enemyGroup.addChild(s);
        this.enemyGroup.addChild(w);
    }
}

PlayState.checkCollisions = function () {

   var enemies = this.enemyGroup.members;
    for (var j = 0; j < enemies.length; j++){
        if(this.fighter.physics.overlaps(enemies[j])){
                
            this.timer.stop();
            this.timer.clear();
            game.states.switchState("DeadState");
            break;
        }
            
    }
    
}