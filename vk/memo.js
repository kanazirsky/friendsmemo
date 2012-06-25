$.extend({
  getUrlVars: function(){
    if (window.location.href.indexOf('?')<0) return;
    var vars = {}, hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
      hash = hashes[i].split('=');
//      alert("hash: "+hash);
      if (hash.length >= 2) 
        vars[unescape(hash[0])] = unescape(hash[1]);
      else vars[unescape(hash[0])]="";
//      vars.push(hash[0]);

    }
    return vars;
  },
  getUrlVar: function(name){
    return $.getUrlVars()[name];
  }
});

$.extend({
  nullif: function(val, nul) {
    if (val!=nul) return val;
  }
});

$.extend( {
  isdefined: function(v) {
     return !(typeof v == "undefined");
  }
});

//var cardsize = 48;    
//var memoengine = {}

memo = {
version: 'devel+',
vk: 1,
//cardsize: 48, 
cardcount: 36,
cardtotal: 15,
cards: [],
achievekey: 1301, //achievement stored variable code 

showcard: function(card) {
//   x = "-"+this.cardsize*(this.cards[card.attr("tab")])+"px 0px"
   var img = "url("+this.cards[card.attr("tab")].photo+")";
//   card.css( {"background-position": 0 } );
   card.css( "background-image", img );
   card.addClass("memoshowed");

},
hidecard: function(card) {
//   card.css( {"background-position": "50px 0px" } );
   card.css( "background-image", "url(http://vkontakte.ru/images/question_c.gif)");
   card.removeClass("memoshowed");

},
hidecards: function(card) {
   this.hidecard(card);
   this.hidecard(this.guesscard);
   this.guesstimer = undefined;
   this.guesscard = undefined;
},
prevcardscore: 0,
guesscard: undefined,
guesstimer: undefined,
guesscount: 0,
misscount: 0,
guesstime: 0,
guess: function(card) {
   this.showcard(card);
   if (this.guesscard) {

     //forget if guessed     
     if (this.cards[card.attr("tab")] == this.cards[this.guesscard.attr("tab")]) {
        //inc score 
        this.guesscount++;
        this.misscount=0;       
 
        var curtime = this.getTimeInMillis();
        var cardscore = 0;
        
        var comboscore = 0;
        //if combo - use combo score
        if ((curtime - this.guesstime) < 2000) {
           comboscore= this.prevcardscore; //Math.round(cardscore / 10);
           cardscore = comboscore;
        } else {
           //score base
           cardscore = (this.cardcount-this.guesscount);
           
        } 
        this.prevcardscore = cardscore; 
        //save card score before mul 
        var scoremul = Math.round(Math.floor(this.score / 100)); //1% of current score bonus 
        cardscore+=scoremul;
        this.score += cardscore; 

        this.guesstime = curtime;

        this.showscore();
        this.showprogress();
        this.putfriendlist(this.cards[card.attr("tab")], cardscore, comboscore);
        this.guesscard = undefined;
        if (this.guesscount>=this.cardcount) {
           this.success(this.level, this.score);
        };
     } else {
        //hide if not guessed
        this.misscount+=2;
        this.guesstimer = setTimeout(function() { memo.hidecards(card); }, 
           1000);
        //clear guess time
        this.guesstime = 0;
     }     
   } else {
     this.guesscard = card;
   }
},
putfriendlist: function(friend, friendscore, scoremul) {
   $('<br>').prependTo($("#friendlist"));
   $('<a target="_blank" />')
     .attr("href","http://vkontakte.ru/"+friend.domain)
     .text(""+this.guesscount+": "+friend.first_name+" "+friend.last_name+"(+"+friendscore+")")
     .prependTo($("#friendlist"));
},

success: function(level, score) {
    if (this.urlvars.viewer_id) { //has a user
      //retreive achievement
      this.getachievement(function(response) {memo.newachievement(response, level, score); });      
    }
    this.cleartimeouts();
//    clearTimeout(this.scoretimer);
    this.showscore(score);
    this.showstartbutton();
},                                 
                       
getachievement: function(callback) {
      VK.api("getVariable", {
        "user_id": this.urlvars.viewer_id,
        "key" : this.achievekey
        }, function(data) {
           if ($.isdefined(data.response)) {
             if (data.response) {
                current = $.parseJSON(data.response);
                callback(current); 
             }
           } else {  
             alert("error: "+$.toJSON(data).split(',').join(', '));
           }
        });

},
newachievement: function(current, level, score) {
  
  if (!current || current === '' || current.ver != this.version ||
   ( current.level<=level && current.score<score )
   ) {
      current = {};
      current.level = level;
      current.score = score;
      current.ver = this.version; 
//      alert("new current: "+$.toJSON(current))
      VK.api("putVariable", {
        "user_id": this.urlvars.viewer_id,
        "key" : this.achievekey,
        "value" : $.toJSON(current)
        }, function(data) {
           if (data.response) {
             memo.showachievement(current); 
           } else {  
             alert("error: "+$.toJSON(data).split(',').join(', '));
           }
        });
  }
},

level: 0,
score: 0,
scoretimer : undefined,
scoreroll : function() {
  this.score -= 1;
  if (this.score<=0) { 
     //stop the game
     this.cleartimeouts(); //clearTimeout(this.guesstimer);
     this.showscore(this.score);
     $("#memoboard div").unbind("mousedown");
     this.showstartbutton(); 
     return;
  }
  this.showscore(this.score);
  var tmo = 500; 

//penalty
  if (this.misscount > (this.cardcount-this.guesscount)) {
    tmo = tmo*(1-this.misscount/((this.cardcount-this.guesscount)*4));
    if (tmo < 100) tmo = 100;
  }
  this.scoretimer = setTimeout(function() { memo.scoreroll();  }, 
           tmo);

},
showscore : function(score) {
   $("#scoreboard").text(score);
},                
showprogress: function(p) {   
   return; //disable showing progress 
   if (!p) p = parseInt(this.guesscount*100/this.cardcount);
   $("#progressboard").text(""+p+"%");
},
showachievement: function(current) {
//  alert("show: "+current+" --- "+$.toJSON(current));
  if (current.score) {
    $("#achievementval").text(current.score).show();
    $("#achievement").show();
  }
},                  
showstartbutton: function() { 
     $("#bstart").show();
     $("#brestart").hide();
},
cleartimeouts: function() {
   clearTimeout(this.guesstimer);
   clearTimeout(this.scoretimer);
   this.guesstimer = undefined;
   this.scoretimer = undefined;
},

checkload: function() {
  var p =this.cardloaded*100/this.cardcount;
//  this.showprogress(this.cardloaded*100/this.cardcount);
  $("#loadprogress").text(""+this.cardloaded+" of "+this.cardcount);
  if (this.cardloaded>=this.cardcount) {
    $("#loading").hide();    
    $("#dashboard").show();
    $("#newgame").show();
//    this.showstartbutton(); 
  }
},     
       
urlvars: undefined,
fiends: undefined,
init: function() {
  this.urlvars = $.getUrlVars();
  $("#dashboard").hide();
  $("#initjs").hide();
  $("#loading").show();
//hide wihle loading images
//  $("#newgame").hide();
//$("#debug").text("urlvars: "+$.toJSON(this.urlvars).split(',').join(', '));
//method=friends.get&uid={viewer_id}&fields=photo&count=22&format=json&v=2.0
//   var apiresult = $.parseJSON(decodeURIComponent(this.urlvars.api_result));
//   $("#debug").text("apiresult: "+$.toJSON(apiresult).split(',').join(', '));
//   $("#debug").text("apiresult: "+apiresult.response);

   //loading friends data
   //need to get 200 friends 
   var maxcards = 200;
   var viewer_id = this.urlvars.viewer_id;
   VK.api("friends.get", {
        "uid": viewer_id, 
        "test_mode": "1"
        }, function(data) {
           if (data.response) {
              var offset = 0;
              if (data.response.length>maxcards) {
                 offset = parseInt(Math.random() * (data.response.length - maxcards));
//                 $("#debug").text("offset: "+offset+" of "+data.response.length);
//                 $("#debug").show();
              }

   VK.api("friends.get", {
        "uid": viewer_id,
        "fields" : "photo, online, domain", 
        "count": maxcards,
        "offset": offset, 
        "test_mode": "1"
//        ,"format":"json","v":"2.0" 
        }, function(data) {
           if (data.response) {
//             $("#debug").text("resp: "+data.response);
             
             memo.initboard(data.response); 
           } else {  
             alert("error: "+$.toJSON(data).split(',').join(', '));
           }
        });
              
           } else {  
             alert("error: "+$.toJSON(data).split(',').join(', '));
           }
        });
   

   this.getachievement(function(a) { memo.showachievement(a); });

},
initboard: function(loaded) {
   this.friends= [];
   this.cardloaded = 0;
   for (var i in loaded) {
     var friend = loaded[i];
     if (this.nophoto(friend)) { continue; }
     this.friends.push(friend);
//try to cache image
     $('<img />')
       .attr('src', friend.photo)
       .load(function(){
          memo.cardloaded=memo.cardloaded+1;
          //alert("loaded: "+memo.cardloaded);
          memo.checkload();
        // Your other custom code
       });


/*     var img = $( document.createElement('img'));
     img.attr("src", friend.photo);
     img.hide();
     img.appendTo($("#memoboard"));
*/
//     alert($.toJSON(apiresult.response[i]));
   }
   this.cardtotal = this.friends.length;
   if (this.friends.length<this.cardcount) { 
       this.cardcount = this.friends.length;
   }

   this.checkload();
//$( document.createElement('div')).css("border","1px solid red").appendTo($("#memoboard"));
 //this.cards.sort(function() {return (Math.round(Math.random())-1); } );
for (i=0;i<this.cardcount*2;i++) {
var div = $( document.createElement('div'));
    div.attr("tab",i);
/*    if (i%10 ==0) {
      div.css("clear","both");
      var br = $("#memoboard").append( document.createElement('br') );
      br.css("clear","both");
    }
*/
    div.appendTo($("#memoboard"));

}
},
starttime: 0,
start: function() {
//   $("#newgame").hide();
   this.cleartimeouts();
   $("#bstart").hide();
   $("#brestart").show();
   $("#friendlist").text("");
   var cards = [];
   this.guesscard = undefined;
   this.guesscount = 0;
   this.misscount = 0; 
   
   //fill array
   var rndcards = [];
   for (i=0;i<this.cardcount;i++) {
     var rndindex = parseInt(Math.random() * this.cardtotal);
     if (rndcards[rndindex]) {       
       for(j=1;j<=Math.max(rndindex,  this.cardcount-1-rndindex);j++ ) {
         rightj = rndindex+j;
         if (rightj<this.cardtotal && !rndcards[rightj]) {
            rndindex = rightj;
            break;
         }
         if (rndindex>=j && !rndcards[rndindex-j]) {
            rndindex = rndindex-j
            break;
         }
       }       
     }

       rndcards[rndindex] = 1;


//       cards.push(rndindex);
//       cards.push(rndindex);     
//      alert(this.friends[rndindex].photo);
      var friend = this.friends[rndindex];
//     alert(friend.photo);
      cards.push(friend);
      cards.push(friend);
   }
   //shuffle array
   this.cards = this.shuffle(cards);
/*   $("#memoboard div").css("background-image", function() {
       return "url("+cards[$(this).attr("tab")].photo+")";
   });
*/
   $("#memoboard div").css( 
     {"background-image":"url(http://vkontakte.ru/images/question_c.gif)"
     /* ,"background-position": "0px" */
     });
/*   $("#memoboard div").text(function() {
       return cards[$(this).attr("tab")];
   });
*/

    $("#memoboard div").mousedown(function() {
            if (memo.guesstimer) return false;
            if ($(this).hasClass("memoshowed")) return false;
            memo.guess($(this));                           
      }
    ).removeClass("memoshowed");
     //.css( {"background-position": "50px 0px" } )

   //init score and time
   this.starttime = this.getTimeInMillis(); 
   this.guesstime = 0;
   this.score = this.cardcount * 4 +1;
   this.showprogress();
   this.scoreroll();

   
}

,getTimeInMillis: function() {
  return new Date().getTime();
}

,nophoto: function(friend) {
  return /question_c.gif$/.test(friend.photo) || /camera_c.gif$/.test(friend.photo) 
         || /deactivated_c.gif$/.test(friend.photo);
}            
//services
//array shuffle 
,shuffle: function(o){ 
  return this.FisherYatesShuffle(o);
}
,FisherYatesShuffle:function(theArray) {
 	var len = theArray.length;
	var i = len;
	 while (i--) {
	 	var p = parseInt(Math.random()*len);
		var t = theArray[i];
  		theArray[i] = theArray[p];
	  	theArray[p] = t;
 	}
        return theArray;
}
//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
,JRSSshuffle: function(o){ //v1.0
	for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	return o;
}

      
}