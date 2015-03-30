var DeadState = new Kiwi.State('DeadState');

DeadState.create = function(){

    this.dead = new Kiwi.GameObjects.StaticImage(this, this.textures['over'], 0, 0);
    this.dead.alpha = 0;
    this.addChild(this.dead);

    showTween = this.game.tweens.create(this.dead);
    showTween.to({alpha: 1}, 2000);

    fadeTween = this.game.tweens.create(this.dead);
    fadeTween.to({alpha: 0}, 2000);
    showTween.chain(fadeTween);
    showTween.start();
    fadeTween.onComplete(function(){
    	game.states.switchState("PlayState");
     }, this);
}

