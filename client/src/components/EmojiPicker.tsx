import { useState, useMemo, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Clock, Smile, Heart, ThumbsUp, Sparkles, Coffee, Flag, Cat, Car } from "lucide-react";

// Emoji categories with icons
const EMOJI_CATEGORIES = [
  { id: "recent", name: "Zuletzt verwendet", icon: Clock },
  { id: "smileys", name: "Smileys & Emotionen", icon: Smile },
  { id: "gestures", name: "Gesten & Körper", icon: ThumbsUp },
  { id: "hearts", name: "Herzen & Liebe", icon: Heart },
  { id: "celebration", name: "Feier & Party", icon: Sparkles },
  { id: "food", name: "Essen & Trinken", icon: Coffee },
  { id: "animals", name: "Tiere & Natur", icon: Cat },
  { id: "travel", name: "Reisen & Orte", icon: Car },
  { id: "symbols", name: "Symbole", icon: Flag },
];

// Emoji data by category
const EMOJIS: Record<string, { emoji: string; keywords: string[] }[]> = {
  smileys: [
    { emoji: "😀", keywords: ["grinning", "happy", "smile", "freude"] },
    { emoji: "😃", keywords: ["grinning", "happy", "smile", "freude", "big"] },
    { emoji: "😄", keywords: ["grinning", "happy", "smile", "freude", "eyes"] },
    { emoji: "😁", keywords: ["grinning", "happy", "smile", "teeth"] },
    { emoji: "😆", keywords: ["laughing", "lachen", "xd"] },
    { emoji: "😅", keywords: ["sweat", "nervous", "laugh"] },
    { emoji: "🤣", keywords: ["rofl", "rolling", "lachen", "floor"] },
    { emoji: "😂", keywords: ["joy", "tears", "lachen", "crying"] },
    { emoji: "🙂", keywords: ["slight", "smile", "lächeln"] },
    { emoji: "🙃", keywords: ["upside", "down", "ironic"] },
    { emoji: "😉", keywords: ["wink", "zwinkern"] },
    { emoji: "😊", keywords: ["blush", "happy", "shy", "schüchtern"] },
    { emoji: "😇", keywords: ["angel", "innocent", "engel", "halo"] },
    { emoji: "🥰", keywords: ["love", "hearts", "liebe", "smiling"] },
    { emoji: "😍", keywords: ["heart", "eyes", "love", "verliebt"] },
    { emoji: "🤩", keywords: ["star", "struck", "excited", "begeistert"] },
    { emoji: "😘", keywords: ["kiss", "kuss", "blowing"] },
    { emoji: "😗", keywords: ["kiss", "kuss"] },
    { emoji: "😚", keywords: ["kiss", "kuss", "closed", "eyes"] },
    { emoji: "😙", keywords: ["kiss", "kuss", "smiling"] },
    { emoji: "🥲", keywords: ["tear", "happy", "sad", "träne"] },
    { emoji: "😋", keywords: ["yum", "delicious", "lecker", "tongue"] },
    { emoji: "😛", keywords: ["tongue", "zunge", "playful"] },
    { emoji: "😜", keywords: ["wink", "tongue", "crazy", "verrückt"] },
    { emoji: "🤪", keywords: ["zany", "crazy", "wild", "verrückt"] },
    { emoji: "😝", keywords: ["tongue", "squint", "playful"] },
    { emoji: "🤑", keywords: ["money", "geld", "rich", "dollar"] },
    { emoji: "🤗", keywords: ["hug", "umarmung", "hugging"] },
    { emoji: "🤭", keywords: ["giggle", "oops", "hand", "mouth"] },
    { emoji: "🤫", keywords: ["shush", "quiet", "secret", "geheim"] },
    { emoji: "🤔", keywords: ["thinking", "denken", "hmm", "nachdenken"] },
    { emoji: "🤐", keywords: ["zipper", "mouth", "quiet", "still"] },
    { emoji: "🤨", keywords: ["raised", "eyebrow", "skeptisch"] },
    { emoji: "😐", keywords: ["neutral", "meh", "expressionless"] },
    { emoji: "😑", keywords: ["expressionless", "blank"] },
    { emoji: "😶", keywords: ["no", "mouth", "speechless", "sprachlos"] },
    { emoji: "😏", keywords: ["smirk", "smug", "flirty"] },
    { emoji: "😒", keywords: ["unamused", "annoyed", "genervt"] },
    { emoji: "🙄", keywords: ["eye", "roll", "augenrollen", "whatever"] },
    { emoji: "😬", keywords: ["grimace", "awkward", "cringe"] },
    { emoji: "🤥", keywords: ["lying", "pinocchio", "lügen"] },
    { emoji: "😌", keywords: ["relieved", "peaceful", "calm", "ruhig"] },
    { emoji: "😔", keywords: ["pensive", "sad", "traurig", "down"] },
    { emoji: "😪", keywords: ["sleepy", "müde", "tired"] },
    { emoji: "🤤", keywords: ["drool", "hungry", "yum"] },
    { emoji: "😴", keywords: ["sleeping", "schlafen", "zzz"] },
    { emoji: "😷", keywords: ["mask", "sick", "krank", "covid"] },
    { emoji: "🤒", keywords: ["thermometer", "sick", "fever", "fieber"] },
    { emoji: "🤕", keywords: ["bandage", "hurt", "injured", "verletzt"] },
    { emoji: "🤢", keywords: ["nauseated", "sick", "green", "übel"] },
    { emoji: "🤮", keywords: ["vomit", "sick", "puke"] },
    { emoji: "🤧", keywords: ["sneeze", "cold", "erkältung"] },
    { emoji: "🥵", keywords: ["hot", "heiß", "sweating"] },
    { emoji: "🥶", keywords: ["cold", "kalt", "freezing"] },
    { emoji: "🥴", keywords: ["woozy", "drunk", "dizzy"] },
    { emoji: "😵", keywords: ["dizzy", "dead", "knocked"] },
    { emoji: "🤯", keywords: ["exploding", "mind", "blown", "wow"] },
    { emoji: "🤠", keywords: ["cowboy", "hat", "yeehaw"] },
    { emoji: "🥳", keywords: ["party", "celebrate", "birthday", "feier"] },
    { emoji: "🥸", keywords: ["disguise", "glasses", "mustache"] },
    { emoji: "😎", keywords: ["cool", "sunglasses", "sonnenbrille"] },
    { emoji: "🤓", keywords: ["nerd", "glasses", "smart", "schlau"] },
    { emoji: "🧐", keywords: ["monocle", "fancy", "inspect"] },
    { emoji: "😕", keywords: ["confused", "verwirrt", "unsure"] },
    { emoji: "😟", keywords: ["worried", "besorgt", "concerned"] },
    { emoji: "🙁", keywords: ["frown", "sad", "traurig"] },
    { emoji: "☹️", keywords: ["frown", "sad", "unhappy"] },
    { emoji: "😮", keywords: ["open", "mouth", "surprised", "überrascht"] },
    { emoji: "😯", keywords: ["hushed", "surprised", "wow"] },
    { emoji: "😲", keywords: ["astonished", "shocked", "schock"] },
    { emoji: "😳", keywords: ["flushed", "embarrassed", "peinlich"] },
    { emoji: "🥺", keywords: ["pleading", "puppy", "eyes", "bitte"] },
    { emoji: "😦", keywords: ["frown", "open", "mouth"] },
    { emoji: "😧", keywords: ["anguished", "worried"] },
    { emoji: "😨", keywords: ["fearful", "scared", "angst"] },
    { emoji: "😰", keywords: ["anxious", "sweat", "nervous"] },
    { emoji: "😥", keywords: ["sad", "relieved", "sweat"] },
    { emoji: "😢", keywords: ["cry", "weinen", "tear", "sad"] },
    { emoji: "😭", keywords: ["sob", "crying", "weinen", "loud"] },
    { emoji: "😱", keywords: ["scream", "fear", "horror", "angst"] },
    { emoji: "😖", keywords: ["confounded", "frustrated"] },
    { emoji: "😣", keywords: ["persevere", "struggle"] },
    { emoji: "😞", keywords: ["disappointed", "enttäuscht", "sad"] },
    { emoji: "😓", keywords: ["downcast", "sweat", "sad"] },
    { emoji: "😩", keywords: ["weary", "tired", "frustrated"] },
    { emoji: "😫", keywords: ["tired", "exhausted", "erschöpft"] },
    { emoji: "🥱", keywords: ["yawn", "tired", "müde", "bored"] },
    { emoji: "😤", keywords: ["triumph", "angry", "huffing"] },
    { emoji: "😡", keywords: ["angry", "wütend", "mad", "pouting"] },
    { emoji: "😠", keywords: ["angry", "wütend", "mad"] },
    { emoji: "🤬", keywords: ["swearing", "cursing", "angry", "symbols"] },
    { emoji: "😈", keywords: ["devil", "smiling", "evil", "teufel"] },
    { emoji: "👿", keywords: ["devil", "angry", "imp"] },
    { emoji: "💀", keywords: ["skull", "dead", "death", "tot"] },
    { emoji: "☠️", keywords: ["skull", "crossbones", "danger"] },
    { emoji: "💩", keywords: ["poop", "poo", "shit"] },
    { emoji: "🤡", keywords: ["clown", "funny", "circus"] },
    { emoji: "👹", keywords: ["ogre", "monster", "scary"] },
    { emoji: "👺", keywords: ["goblin", "tengu", "angry"] },
    { emoji: "👻", keywords: ["ghost", "geist", "boo", "halloween"] },
    { emoji: "👽", keywords: ["alien", "ufo", "extraterrestrial"] },
    { emoji: "👾", keywords: ["alien", "monster", "game", "pixel"] },
    { emoji: "🤖", keywords: ["robot", "bot", "machine"] },
    { emoji: "😺", keywords: ["cat", "smile", "katze", "happy"] },
    { emoji: "😸", keywords: ["cat", "grin", "katze"] },
    { emoji: "😹", keywords: ["cat", "joy", "tears", "katze"] },
    { emoji: "😻", keywords: ["cat", "heart", "eyes", "love"] },
    { emoji: "😼", keywords: ["cat", "smirk", "wry"] },
    { emoji: "😽", keywords: ["cat", "kiss", "kuss"] },
    { emoji: "🙀", keywords: ["cat", "weary", "shocked"] },
    { emoji: "😿", keywords: ["cat", "cry", "sad"] },
    { emoji: "😾", keywords: ["cat", "pouting", "angry"] },
  ],
  gestures: [
    { emoji: "👋", keywords: ["wave", "hello", "bye", "hallo", "tschüss"] },
    { emoji: "🤚", keywords: ["raised", "back", "hand", "stop"] },
    { emoji: "🖐️", keywords: ["hand", "fingers", "splayed", "five"] },
    { emoji: "✋", keywords: ["raised", "hand", "stop", "high five"] },
    { emoji: "🖖", keywords: ["vulcan", "spock", "star trek"] },
    { emoji: "👌", keywords: ["ok", "okay", "perfect", "perfekt"] },
    { emoji: "🤌", keywords: ["pinched", "italian", "chef", "kiss"] },
    { emoji: "🤏", keywords: ["pinching", "small", "tiny", "klein"] },
    { emoji: "✌️", keywords: ["victory", "peace", "two", "v"] },
    { emoji: "🤞", keywords: ["crossed", "fingers", "luck", "glück"] },
    { emoji: "🤟", keywords: ["love", "you", "rock", "gesture"] },
    { emoji: "🤘", keywords: ["rock", "metal", "horns"] },
    { emoji: "🤙", keywords: ["call", "shaka", "hang loose"] },
    { emoji: "👈", keywords: ["point", "left", "links"] },
    { emoji: "👉", keywords: ["point", "right", "rechts"] },
    { emoji: "👆", keywords: ["point", "up", "oben"] },
    { emoji: "🖕", keywords: ["middle", "finger", "rude"] },
    { emoji: "👇", keywords: ["point", "down", "unten"] },
    { emoji: "☝️", keywords: ["point", "up", "index"] },
    { emoji: "👍", keywords: ["thumbs", "up", "like", "gut", "daumen"] },
    { emoji: "👎", keywords: ["thumbs", "down", "dislike", "schlecht"] },
    { emoji: "✊", keywords: ["fist", "raised", "power", "faust"] },
    { emoji: "👊", keywords: ["fist", "bump", "punch"] },
    { emoji: "🤛", keywords: ["fist", "left", "bump"] },
    { emoji: "🤜", keywords: ["fist", "right", "bump"] },
    { emoji: "👏", keywords: ["clap", "applause", "klatschen", "bravo"] },
    { emoji: "🙌", keywords: ["raising", "hands", "celebrate", "yay"] },
    { emoji: "👐", keywords: ["open", "hands", "jazz"] },
    { emoji: "🤲", keywords: ["palms", "up", "prayer"] },
    { emoji: "🤝", keywords: ["handshake", "deal", "agreement", "händedruck"] },
    { emoji: "🙏", keywords: ["pray", "please", "thanks", "bitte", "danke"] },
    { emoji: "✍️", keywords: ["writing", "hand", "schreiben"] },
    { emoji: "💅", keywords: ["nail", "polish", "beauty"] },
    { emoji: "🤳", keywords: ["selfie", "phone", "camera"] },
    { emoji: "💪", keywords: ["muscle", "strong", "flex", "stark", "bizeps"] },
    { emoji: "🦾", keywords: ["mechanical", "arm", "robot", "prosthetic"] },
    { emoji: "🦿", keywords: ["mechanical", "leg", "prosthetic"] },
    { emoji: "🦵", keywords: ["leg", "kick", "bein"] },
    { emoji: "🦶", keywords: ["foot", "kick", "fuß"] },
    { emoji: "👂", keywords: ["ear", "listen", "ohr", "hören"] },
    { emoji: "🦻", keywords: ["ear", "hearing", "aid"] },
    { emoji: "👃", keywords: ["nose", "smell", "nase"] },
    { emoji: "🧠", keywords: ["brain", "smart", "think", "gehirn"] },
    { emoji: "👀", keywords: ["eyes", "look", "see", "augen"] },
    { emoji: "👁️", keywords: ["eye", "see", "auge"] },
    { emoji: "👅", keywords: ["tongue", "taste", "zunge"] },
    { emoji: "👄", keywords: ["mouth", "lips", "kiss", "mund"] },
  ],
  hearts: [
    { emoji: "❤️", keywords: ["red", "heart", "love", "herz", "liebe"] },
    { emoji: "🧡", keywords: ["orange", "heart", "herz"] },
    { emoji: "💛", keywords: ["yellow", "heart", "herz", "gelb"] },
    { emoji: "💚", keywords: ["green", "heart", "herz", "grün"] },
    { emoji: "💙", keywords: ["blue", "heart", "herz", "blau"] },
    { emoji: "💜", keywords: ["purple", "heart", "herz", "lila"] },
    { emoji: "🖤", keywords: ["black", "heart", "herz", "schwarz"] },
    { emoji: "🤍", keywords: ["white", "heart", "herz", "weiß"] },
    { emoji: "🤎", keywords: ["brown", "heart", "herz", "braun"] },
    { emoji: "💔", keywords: ["broken", "heart", "sad", "gebrochenes"] },
    { emoji: "❣️", keywords: ["heart", "exclamation", "love"] },
    { emoji: "💕", keywords: ["two", "hearts", "love", "herzen"] },
    { emoji: "💞", keywords: ["revolving", "hearts", "love"] },
    { emoji: "💓", keywords: ["beating", "heart", "love"] },
    { emoji: "💗", keywords: ["growing", "heart", "love"] },
    { emoji: "💖", keywords: ["sparkling", "heart", "love"] },
    { emoji: "💘", keywords: ["cupid", "heart", "arrow", "love"] },
    { emoji: "💝", keywords: ["gift", "heart", "ribbon", "love"] },
    { emoji: "💟", keywords: ["heart", "decoration", "love"] },
    { emoji: "😍", keywords: ["heart", "eyes", "love", "verliebt"] },
    { emoji: "🥰", keywords: ["smiling", "hearts", "love", "liebe"] },
    { emoji: "😘", keywords: ["kiss", "heart", "kuss", "love"] },
    { emoji: "😻", keywords: ["cat", "heart", "eyes", "love"] },
    { emoji: "💑", keywords: ["couple", "heart", "love", "paar"] },
    { emoji: "💏", keywords: ["kiss", "couple", "love"] },
    { emoji: "👩‍❤️‍👨", keywords: ["couple", "heart", "love", "man", "woman"] },
    { emoji: "👨‍❤️‍👨", keywords: ["couple", "heart", "love", "men"] },
    { emoji: "👩‍❤️‍👩", keywords: ["couple", "heart", "love", "women"] },
  ],
  celebration: [
    { emoji: "🎉", keywords: ["party", "popper", "celebrate", "feier", "konfetti"] },
    { emoji: "🎊", keywords: ["confetti", "ball", "party", "konfetti"] },
    { emoji: "🎈", keywords: ["balloon", "party", "birthday", "luftballon"] },
    { emoji: "🎁", keywords: ["gift", "present", "geschenk", "birthday"] },
    { emoji: "🎂", keywords: ["cake", "birthday", "kuchen", "geburtstag"] },
    { emoji: "🍰", keywords: ["cake", "slice", "dessert", "kuchen"] },
    { emoji: "🧁", keywords: ["cupcake", "dessert", "sweet"] },
    { emoji: "🥳", keywords: ["party", "face", "celebrate", "birthday"] },
    { emoji: "🎆", keywords: ["fireworks", "feuerwerk", "new year"] },
    { emoji: "🎇", keywords: ["sparkler", "fireworks", "wunderkerze"] },
    { emoji: "✨", keywords: ["sparkles", "glitter", "magic", "funkeln"] },
    { emoji: "🌟", keywords: ["star", "glowing", "stern", "shine"] },
    { emoji: "⭐", keywords: ["star", "stern", "favorite"] },
    { emoji: "🏆", keywords: ["trophy", "winner", "pokal", "gewinner"] },
    { emoji: "🥇", keywords: ["gold", "medal", "first", "winner", "medaille"] },
    { emoji: "🥈", keywords: ["silver", "medal", "second", "medaille"] },
    { emoji: "🥉", keywords: ["bronze", "medal", "third", "medaille"] },
    { emoji: "🎖️", keywords: ["military", "medal", "honor"] },
    { emoji: "🏅", keywords: ["sports", "medal", "winner"] },
    { emoji: "🎗️", keywords: ["ribbon", "awareness", "support"] },
    { emoji: "🎀", keywords: ["ribbon", "bow", "gift", "schleife"] },
    { emoji: "🎄", keywords: ["christmas", "tree", "weihnachten", "tannenbaum"] },
    { emoji: "🎃", keywords: ["pumpkin", "halloween", "kürbis"] },
    { emoji: "🎅", keywords: ["santa", "christmas", "weihnachtsmann"] },
    { emoji: "🤶", keywords: ["mrs", "claus", "christmas"] },
    { emoji: "🧑‍🎄", keywords: ["mx", "claus", "christmas"] },
    { emoji: "🦌", keywords: ["deer", "reindeer", "christmas", "rentier"] },
    { emoji: "🍾", keywords: ["champagne", "bottle", "celebrate", "sekt"] },
    { emoji: "🥂", keywords: ["clinking", "glasses", "cheers", "prost", "anstoßen"] },
    { emoji: "🍻", keywords: ["beer", "mugs", "cheers", "prost", "bier"] },
    { emoji: "🎵", keywords: ["music", "note", "musik", "note"] },
    { emoji: "🎶", keywords: ["music", "notes", "musik", "noten"] },
    { emoji: "🎤", keywords: ["microphone", "karaoke", "mikrofon", "sing"] },
    { emoji: "🎧", keywords: ["headphones", "music", "kopfhörer"] },
    { emoji: "🎸", keywords: ["guitar", "music", "rock", "gitarre"] },
    { emoji: "🎹", keywords: ["piano", "keyboard", "music", "klavier"] },
    { emoji: "🎺", keywords: ["trumpet", "music", "trompete"] },
    { emoji: "🎷", keywords: ["saxophone", "music", "jazz", "saxophon"] },
    { emoji: "🪘", keywords: ["drum", "music", "trommel"] },
    { emoji: "🎻", keywords: ["violin", "music", "geige"] },
  ],
  food: [
    { emoji: "☕", keywords: ["coffee", "kaffee", "hot", "drink"] },
    { emoji: "🍵", keywords: ["tea", "tee", "green", "drink"] },
    { emoji: "🧃", keywords: ["juice", "box", "saft"] },
    { emoji: "🥤", keywords: ["cup", "straw", "drink", "soda"] },
    { emoji: "🍺", keywords: ["beer", "bier", "mug", "drink"] },
    { emoji: "🍻", keywords: ["beers", "bier", "cheers", "prost"] },
    { emoji: "🥂", keywords: ["champagne", "cheers", "sekt", "prost"] },
    { emoji: "🍷", keywords: ["wine", "wein", "red", "drink"] },
    { emoji: "🥃", keywords: ["whiskey", "tumbler", "drink"] },
    { emoji: "🍸", keywords: ["cocktail", "martini", "drink"] },
    { emoji: "🍹", keywords: ["tropical", "drink", "cocktail"] },
    { emoji: "🧋", keywords: ["bubble", "tea", "boba"] },
    { emoji: "🍕", keywords: ["pizza", "food", "italian"] },
    { emoji: "🍔", keywords: ["burger", "hamburger", "food"] },
    { emoji: "🍟", keywords: ["fries", "pommes", "food"] },
    { emoji: "🌭", keywords: ["hot", "dog", "food"] },
    { emoji: "🥪", keywords: ["sandwich", "food", "lunch"] },
    { emoji: "🌮", keywords: ["taco", "mexican", "food"] },
    { emoji: "🌯", keywords: ["burrito", "wrap", "food"] },
    { emoji: "🥗", keywords: ["salad", "healthy", "food", "salat"] },
    { emoji: "🍝", keywords: ["spaghetti", "pasta", "italian", "food"] },
    { emoji: "🍜", keywords: ["noodles", "ramen", "soup", "nudeln"] },
    { emoji: "🍲", keywords: ["pot", "food", "stew", "eintopf"] },
    { emoji: "🍛", keywords: ["curry", "rice", "food"] },
    { emoji: "🍣", keywords: ["sushi", "japanese", "food"] },
    { emoji: "🍱", keywords: ["bento", "box", "japanese", "food"] },
    { emoji: "🥟", keywords: ["dumpling", "food", "asian"] },
    { emoji: "🍩", keywords: ["donut", "doughnut", "sweet"] },
    { emoji: "🍪", keywords: ["cookie", "keks", "sweet"] },
    { emoji: "🎂", keywords: ["cake", "birthday", "kuchen"] },
    { emoji: "🍰", keywords: ["cake", "slice", "kuchen", "dessert"] },
    { emoji: "🧁", keywords: ["cupcake", "sweet", "dessert"] },
    { emoji: "🥧", keywords: ["pie", "dessert", "kuchen"] },
    { emoji: "🍫", keywords: ["chocolate", "schokolade", "sweet"] },
    { emoji: "🍬", keywords: ["candy", "süßigkeit", "sweet"] },
    { emoji: "🍭", keywords: ["lollipop", "candy", "sweet"] },
    { emoji: "🍦", keywords: ["ice", "cream", "eis", "dessert"] },
    { emoji: "🍨", keywords: ["ice", "cream", "sundae", "eis"] },
    { emoji: "🍧", keywords: ["shaved", "ice", "dessert"] },
    { emoji: "🥐", keywords: ["croissant", "french", "breakfast"] },
    { emoji: "🥖", keywords: ["baguette", "bread", "brot"] },
    { emoji: "🥨", keywords: ["pretzel", "brezel", "snack"] },
    { emoji: "🧀", keywords: ["cheese", "käse", "food"] },
    { emoji: "🥚", keywords: ["egg", "ei", "food"] },
    { emoji: "🍳", keywords: ["cooking", "egg", "fried", "spiegelei"] },
    { emoji: "🥓", keywords: ["bacon", "speck", "breakfast"] },
    { emoji: "🥩", keywords: ["steak", "meat", "fleisch"] },
    { emoji: "🍗", keywords: ["chicken", "leg", "hähnchen"] },
    { emoji: "🍖", keywords: ["meat", "bone", "fleisch"] },
    { emoji: "🌽", keywords: ["corn", "mais", "vegetable"] },
    { emoji: "🥕", keywords: ["carrot", "karotte", "vegetable"] },
    { emoji: "🥔", keywords: ["potato", "kartoffel", "vegetable"] },
    { emoji: "🍅", keywords: ["tomato", "tomate", "vegetable"] },
    { emoji: "🥒", keywords: ["cucumber", "gurke", "vegetable"] },
    { emoji: "🥬", keywords: ["leafy", "green", "vegetable", "salat"] },
    { emoji: "🥦", keywords: ["broccoli", "brokkoli", "vegetable"] },
    { emoji: "🧄", keywords: ["garlic", "knoblauch", "food"] },
    { emoji: "🧅", keywords: ["onion", "zwiebel", "food"] },
    { emoji: "🍄", keywords: ["mushroom", "pilz", "food"] },
    { emoji: "🍎", keywords: ["apple", "apfel", "red", "fruit"] },
    { emoji: "🍐", keywords: ["pear", "birne", "fruit"] },
    { emoji: "🍊", keywords: ["orange", "fruit", "citrus"] },
    { emoji: "🍋", keywords: ["lemon", "zitrone", "fruit"] },
    { emoji: "🍌", keywords: ["banana", "banane", "fruit"] },
    { emoji: "🍉", keywords: ["watermelon", "wassermelone", "fruit"] },
    { emoji: "🍇", keywords: ["grapes", "trauben", "fruit"] },
    { emoji: "🍓", keywords: ["strawberry", "erdbeere", "fruit"] },
    { emoji: "🫐", keywords: ["blueberry", "blaubeere", "fruit"] },
    { emoji: "🍒", keywords: ["cherry", "kirsche", "fruit"] },
    { emoji: "🍑", keywords: ["peach", "pfirsich", "fruit"] },
    { emoji: "🥭", keywords: ["mango", "fruit", "tropical"] },
    { emoji: "🍍", keywords: ["pineapple", "ananas", "fruit"] },
    { emoji: "🥥", keywords: ["coconut", "kokosnuss", "fruit"] },
    { emoji: "🥝", keywords: ["kiwi", "fruit", "green"] },
    { emoji: "🍆", keywords: ["eggplant", "aubergine", "vegetable"] },
    { emoji: "🥑", keywords: ["avocado", "fruit", "green"] },
  ],
  animals: [
    { emoji: "🐶", keywords: ["dog", "hund", "puppy", "face"] },
    { emoji: "🐕", keywords: ["dog", "hund", "pet"] },
    { emoji: "🐩", keywords: ["poodle", "dog", "pudel"] },
    { emoji: "🐺", keywords: ["wolf", "face", "animal"] },
    { emoji: "🦊", keywords: ["fox", "fuchs", "face"] },
    { emoji: "🦝", keywords: ["raccoon", "waschbär", "animal"] },
    { emoji: "🐱", keywords: ["cat", "katze", "face", "pet"] },
    { emoji: "🐈", keywords: ["cat", "katze", "pet"] },
    { emoji: "🦁", keywords: ["lion", "löwe", "face"] },
    { emoji: "🐯", keywords: ["tiger", "face", "animal"] },
    { emoji: "🐅", keywords: ["tiger", "animal"] },
    { emoji: "🐆", keywords: ["leopard", "animal", "spots"] },
    { emoji: "🐴", keywords: ["horse", "pferd", "face"] },
    { emoji: "🐎", keywords: ["horse", "pferd", "racing"] },
    { emoji: "🦄", keywords: ["unicorn", "einhorn", "magic"] },
    { emoji: "🦓", keywords: ["zebra", "stripes", "animal"] },
    { emoji: "🐮", keywords: ["cow", "kuh", "face"] },
    { emoji: "🐂", keywords: ["ox", "bull", "stier"] },
    { emoji: "🐃", keywords: ["water", "buffalo", "animal"] },
    { emoji: "🐄", keywords: ["cow", "kuh", "animal"] },
    { emoji: "🐷", keywords: ["pig", "schwein", "face"] },
    { emoji: "🐖", keywords: ["pig", "schwein", "animal"] },
    { emoji: "🐗", keywords: ["boar", "wildschwein", "animal"] },
    { emoji: "🐽", keywords: ["pig", "nose", "schwein"] },
    { emoji: "🐏", keywords: ["ram", "sheep", "schaf"] },
    { emoji: "🐑", keywords: ["sheep", "schaf", "animal"] },
    { emoji: "🐐", keywords: ["goat", "ziege", "animal"] },
    { emoji: "🐪", keywords: ["camel", "kamel", "desert"] },
    { emoji: "🐫", keywords: ["camel", "kamel", "two", "humps"] },
    { emoji: "🦙", keywords: ["llama", "lama", "animal"] },
    { emoji: "🦒", keywords: ["giraffe", "animal", "tall"] },
    { emoji: "🐘", keywords: ["elephant", "elefant", "animal"] },
    { emoji: "🦣", keywords: ["mammoth", "extinct", "animal"] },
    { emoji: "🦏", keywords: ["rhinoceros", "nashorn", "animal"] },
    { emoji: "🦛", keywords: ["hippopotamus", "nilpferd", "animal"] },
    { emoji: "🐭", keywords: ["mouse", "maus", "face"] },
    { emoji: "🐁", keywords: ["mouse", "maus", "animal"] },
    { emoji: "🐀", keywords: ["rat", "ratte", "animal"] },
    { emoji: "🐹", keywords: ["hamster", "face", "pet"] },
    { emoji: "🐰", keywords: ["rabbit", "hase", "bunny", "face"] },
    { emoji: "🐇", keywords: ["rabbit", "hase", "bunny"] },
    { emoji: "🐿️", keywords: ["squirrel", "eichhörnchen", "chipmunk"] },
    { emoji: "🦫", keywords: ["beaver", "biber", "animal"] },
    { emoji: "🦔", keywords: ["hedgehog", "igel", "animal"] },
    { emoji: "🦇", keywords: ["bat", "fledermaus", "animal"] },
    { emoji: "🐻", keywords: ["bear", "bär", "face"] },
    { emoji: "🐻‍❄️", keywords: ["polar", "bear", "eisbär"] },
    { emoji: "🐨", keywords: ["koala", "animal", "australia"] },
    { emoji: "🐼", keywords: ["panda", "animal", "bear"] },
    { emoji: "🦥", keywords: ["sloth", "faultier", "slow"] },
    { emoji: "🦦", keywords: ["otter", "animal", "water"] },
    { emoji: "🦨", keywords: ["skunk", "stinktier", "animal"] },
    { emoji: "🦘", keywords: ["kangaroo", "känguru", "australia"] },
    { emoji: "🦡", keywords: ["badger", "dachs", "animal"] },
    { emoji: "🐾", keywords: ["paw", "prints", "pfote", "animal"] },
    { emoji: "🦃", keywords: ["turkey", "truthahn", "bird"] },
    { emoji: "🐔", keywords: ["chicken", "huhn", "bird"] },
    { emoji: "🐓", keywords: ["rooster", "hahn", "bird"] },
    { emoji: "🐣", keywords: ["chick", "küken", "hatching"] },
    { emoji: "🐤", keywords: ["chick", "küken", "baby"] },
    { emoji: "🐥", keywords: ["chick", "küken", "front"] },
    { emoji: "🐦", keywords: ["bird", "vogel", "animal"] },
    { emoji: "🐧", keywords: ["penguin", "pinguin", "bird"] },
    { emoji: "🕊️", keywords: ["dove", "taube", "peace"] },
    { emoji: "🦅", keywords: ["eagle", "adler", "bird"] },
    { emoji: "🦆", keywords: ["duck", "ente", "bird"] },
    { emoji: "🦢", keywords: ["swan", "schwan", "bird"] },
    { emoji: "🦉", keywords: ["owl", "eule", "bird"] },
    { emoji: "🦤", keywords: ["dodo", "extinct", "bird"] },
    { emoji: "🪶", keywords: ["feather", "feder", "bird"] },
    { emoji: "🦩", keywords: ["flamingo", "bird", "pink"] },
    { emoji: "🦚", keywords: ["peacock", "pfau", "bird"] },
    { emoji: "🦜", keywords: ["parrot", "papagei", "bird"] },
    { emoji: "🐸", keywords: ["frog", "frosch", "face"] },
    { emoji: "🐊", keywords: ["crocodile", "krokodil", "animal"] },
    { emoji: "🐢", keywords: ["turtle", "schildkröte", "animal"] },
    { emoji: "🦎", keywords: ["lizard", "eidechse", "animal"] },
    { emoji: "🐍", keywords: ["snake", "schlange", "animal"] },
    { emoji: "🐲", keywords: ["dragon", "drache", "face"] },
    { emoji: "🐉", keywords: ["dragon", "drache", "animal"] },
    { emoji: "🦕", keywords: ["dinosaur", "dinosaurier", "sauropod"] },
    { emoji: "🦖", keywords: ["t-rex", "dinosaur", "dinosaurier"] },
    { emoji: "🐳", keywords: ["whale", "wal", "spouting"] },
    { emoji: "🐋", keywords: ["whale", "wal", "animal"] },
    { emoji: "🐬", keywords: ["dolphin", "delfin", "animal"] },
    { emoji: "🦭", keywords: ["seal", "robbe", "animal"] },
    { emoji: "🐟", keywords: ["fish", "fisch", "animal"] },
    { emoji: "🐠", keywords: ["tropical", "fish", "fisch"] },
    { emoji: "🐡", keywords: ["blowfish", "kugelfisch", "fish"] },
    { emoji: "🦈", keywords: ["shark", "hai", "animal"] },
    { emoji: "🐙", keywords: ["octopus", "krake", "animal"] },
    { emoji: "🐚", keywords: ["shell", "muschel", "beach"] },
    { emoji: "🐌", keywords: ["snail", "schnecke", "slow"] },
    { emoji: "🦋", keywords: ["butterfly", "schmetterling", "insect"] },
    { emoji: "🐛", keywords: ["bug", "käfer", "insect"] },
    { emoji: "🐜", keywords: ["ant", "ameise", "insect"] },
    { emoji: "🐝", keywords: ["bee", "biene", "honey"] },
    { emoji: "🪲", keywords: ["beetle", "käfer", "insect"] },
    { emoji: "🐞", keywords: ["ladybug", "marienkäfer", "insect"] },
    { emoji: "🦗", keywords: ["cricket", "grille", "insect"] },
    { emoji: "🪳", keywords: ["cockroach", "kakerlake", "insect"] },
    { emoji: "🕷️", keywords: ["spider", "spinne", "insect"] },
    { emoji: "🕸️", keywords: ["spider", "web", "spinnennetz"] },
    { emoji: "🦂", keywords: ["scorpion", "skorpion", "animal"] },
    { emoji: "🦟", keywords: ["mosquito", "mücke", "insect"] },
    { emoji: "🪰", keywords: ["fly", "fliege", "insect"] },
    { emoji: "🪱", keywords: ["worm", "wurm", "animal"] },
    { emoji: "🌸", keywords: ["cherry", "blossom", "kirschblüte", "flower"] },
    { emoji: "💮", keywords: ["white", "flower", "blume"] },
    { emoji: "🏵️", keywords: ["rosette", "flower", "blume"] },
    { emoji: "🌹", keywords: ["rose", "flower", "blume", "red"] },
    { emoji: "🥀", keywords: ["wilted", "flower", "sad", "blume"] },
    { emoji: "🌺", keywords: ["hibiscus", "flower", "blume"] },
    { emoji: "🌻", keywords: ["sunflower", "sonnenblume", "flower"] },
    { emoji: "🌼", keywords: ["blossom", "flower", "blume"] },
    { emoji: "🌷", keywords: ["tulip", "tulpe", "flower"] },
    { emoji: "🌱", keywords: ["seedling", "plant", "pflanze", "grow"] },
    { emoji: "🪴", keywords: ["potted", "plant", "pflanze"] },
    { emoji: "🌲", keywords: ["evergreen", "tree", "baum", "christmas"] },
    { emoji: "🌳", keywords: ["deciduous", "tree", "baum"] },
    { emoji: "🌴", keywords: ["palm", "tree", "palme", "tropical"] },
    { emoji: "🌵", keywords: ["cactus", "kaktus", "desert"] },
    { emoji: "🌾", keywords: ["sheaf", "rice", "wheat", "weizen"] },
    { emoji: "🌿", keywords: ["herb", "plant", "pflanze", "green"] },
    { emoji: "☘️", keywords: ["shamrock", "clover", "klee", "irish"] },
    { emoji: "🍀", keywords: ["four", "leaf", "clover", "luck", "kleeblatt"] },
    { emoji: "🍁", keywords: ["maple", "leaf", "fall", "autumn", "herbst"] },
    { emoji: "🍂", keywords: ["fallen", "leaf", "autumn", "herbst"] },
    { emoji: "🍃", keywords: ["leaf", "wind", "blatt", "nature"] },
  ],
  travel: [
    { emoji: "🚗", keywords: ["car", "auto", "red", "vehicle"] },
    { emoji: "🚕", keywords: ["taxi", "cab", "car", "vehicle"] },
    { emoji: "🚙", keywords: ["suv", "car", "auto", "vehicle"] },
    { emoji: "🚌", keywords: ["bus", "vehicle", "transport"] },
    { emoji: "🚎", keywords: ["trolleybus", "bus", "vehicle"] },
    { emoji: "🏎️", keywords: ["racing", "car", "auto", "fast"] },
    { emoji: "🚓", keywords: ["police", "car", "polizei", "auto"] },
    { emoji: "🚑", keywords: ["ambulance", "krankenwagen", "emergency"] },
    { emoji: "🚒", keywords: ["fire", "engine", "feuerwehr", "truck"] },
    { emoji: "🚐", keywords: ["minibus", "van", "vehicle"] },
    { emoji: "🛻", keywords: ["pickup", "truck", "vehicle"] },
    { emoji: "🚚", keywords: ["truck", "delivery", "lkw"] },
    { emoji: "🚛", keywords: ["articulated", "lorry", "truck"] },
    { emoji: "🚜", keywords: ["tractor", "traktor", "farm"] },
    { emoji: "🏍️", keywords: ["motorcycle", "motorrad", "vehicle"] },
    { emoji: "🛵", keywords: ["scooter", "roller", "vehicle"] },
    { emoji: "🚲", keywords: ["bicycle", "fahrrad", "bike"] },
    { emoji: "🛴", keywords: ["scooter", "kick", "roller"] },
    { emoji: "🚃", keywords: ["railway", "car", "train", "zug"] },
    { emoji: "🚋", keywords: ["tram", "car", "straßenbahn"] },
    { emoji: "🚆", keywords: ["train", "zug", "transport"] },
    { emoji: "🚇", keywords: ["metro", "subway", "u-bahn"] },
    { emoji: "🚈", keywords: ["light", "rail", "train"] },
    { emoji: "🚂", keywords: ["locomotive", "steam", "train", "dampflok"] },
    { emoji: "✈️", keywords: ["airplane", "flugzeug", "travel", "flight"] },
    { emoji: "🛫", keywords: ["departure", "airplane", "takeoff", "abflug"] },
    { emoji: "🛬", keywords: ["arrival", "airplane", "landing", "ankunft"] },
    { emoji: "🚀", keywords: ["rocket", "rakete", "space", "launch"] },
    { emoji: "🛸", keywords: ["ufo", "flying", "saucer", "alien"] },
    { emoji: "🚁", keywords: ["helicopter", "hubschrauber", "vehicle"] },
    { emoji: "🛶", keywords: ["canoe", "kanu", "boat"] },
    { emoji: "⛵", keywords: ["sailboat", "segelboot", "boat"] },
    { emoji: "🚤", keywords: ["speedboat", "boat", "schnellboot"] },
    { emoji: "🛥️", keywords: ["motor", "boat", "motorboot"] },
    { emoji: "🛳️", keywords: ["passenger", "ship", "kreuzfahrt"] },
    { emoji: "⛴️", keywords: ["ferry", "fähre", "boat"] },
    { emoji: "🚢", keywords: ["ship", "schiff", "boat"] },
    { emoji: "⚓", keywords: ["anchor", "anker", "ship"] },
    { emoji: "🗼", keywords: ["tokyo", "tower", "turm"] },
    { emoji: "🗽", keywords: ["statue", "liberty", "freiheitsstatue", "usa"] },
    { emoji: "🗿", keywords: ["moai", "easter", "island", "statue"] },
    { emoji: "🏰", keywords: ["castle", "schloss", "burg"] },
    { emoji: "🏯", keywords: ["japanese", "castle", "japan"] },
    { emoji: "🏟️", keywords: ["stadium", "stadion", "sports"] },
    { emoji: "🎡", keywords: ["ferris", "wheel", "riesenrad"] },
    { emoji: "🎢", keywords: ["roller", "coaster", "achterbahn"] },
    { emoji: "🎠", keywords: ["carousel", "karussell", "horse"] },
    { emoji: "⛲", keywords: ["fountain", "brunnen", "water"] },
    { emoji: "⛱️", keywords: ["umbrella", "beach", "sonnenschirm"] },
    { emoji: "🏖️", keywords: ["beach", "strand", "vacation"] },
    { emoji: "🏝️", keywords: ["island", "insel", "desert", "tropical"] },
    { emoji: "🏜️", keywords: ["desert", "wüste", "sand"] },
    { emoji: "🌋", keywords: ["volcano", "vulkan", "mountain"] },
    { emoji: "⛰️", keywords: ["mountain", "berg", "nature"] },
    { emoji: "🏔️", keywords: ["snow", "mountain", "berg", "schnee"] },
    { emoji: "🗻", keywords: ["mount", "fuji", "japan", "mountain"] },
    { emoji: "🏕️", keywords: ["camping", "tent", "zelt", "outdoor"] },
    { emoji: "🏠", keywords: ["house", "haus", "home"] },
    { emoji: "🏡", keywords: ["house", "garden", "haus", "garten"] },
    { emoji: "🏢", keywords: ["office", "building", "büro", "gebäude"] },
    { emoji: "🏣", keywords: ["japanese", "post", "office"] },
    { emoji: "🏤", keywords: ["european", "post", "office"] },
    { emoji: "🏥", keywords: ["hospital", "krankenhaus", "medical"] },
    { emoji: "🏦", keywords: ["bank", "building", "money"] },
    { emoji: "🏨", keywords: ["hotel", "building", "travel"] },
    { emoji: "🏩", keywords: ["love", "hotel", "building"] },
    { emoji: "🏪", keywords: ["convenience", "store", "laden"] },
    { emoji: "🏫", keywords: ["school", "schule", "building"] },
    { emoji: "🏬", keywords: ["department", "store", "kaufhaus"] },
    { emoji: "🏭", keywords: ["factory", "fabrik", "building"] },
    { emoji: "🏗️", keywords: ["construction", "baustelle", "building"] },
    { emoji: "🌃", keywords: ["night", "city", "nacht", "stadt"] },
    { emoji: "🌆", keywords: ["cityscape", "dusk", "stadt", "abend"] },
    { emoji: "🌇", keywords: ["sunset", "sonnenuntergang", "city"] },
    { emoji: "🌉", keywords: ["bridge", "brücke", "night"] },
    { emoji: "🌌", keywords: ["milky", "way", "galaxy", "stars", "milchstraße"] },
    { emoji: "🌠", keywords: ["shooting", "star", "sternschnuppe"] },
    { emoji: "🎇", keywords: ["sparkler", "fireworks", "wunderkerze"] },
    { emoji: "🎆", keywords: ["fireworks", "feuerwerk", "celebration"] },
    { emoji: "🌅", keywords: ["sunrise", "sonnenaufgang", "morning"] },
    { emoji: "🌄", keywords: ["sunrise", "mountains", "berg", "morgen"] },
  ],
  symbols: [
    { emoji: "✅", keywords: ["check", "mark", "done", "erledigt", "ok"] },
    { emoji: "❌", keywords: ["cross", "mark", "wrong", "falsch", "no"] },
    { emoji: "❓", keywords: ["question", "frage", "mark"] },
    { emoji: "❗", keywords: ["exclamation", "ausrufezeichen", "important"] },
    { emoji: "⭐", keywords: ["star", "stern", "favorite"] },
    { emoji: "🔥", keywords: ["fire", "feuer", "hot", "lit"] },
    { emoji: "💯", keywords: ["hundred", "perfect", "score", "100"] },
    { emoji: "💢", keywords: ["anger", "symbol", "wut"] },
    { emoji: "💥", keywords: ["collision", "boom", "explosion"] },
    { emoji: "💫", keywords: ["dizzy", "star", "sparkle"] },
    { emoji: "💦", keywords: ["sweat", "droplets", "water"] },
    { emoji: "💨", keywords: ["dash", "wind", "fast"] },
    { emoji: "🕳️", keywords: ["hole", "loch", "black"] },
    { emoji: "💬", keywords: ["speech", "bubble", "comment", "sprechblase"] },
    { emoji: "👁️‍🗨️", keywords: ["eye", "speech", "witness"] },
    { emoji: "🗨️", keywords: ["left", "speech", "bubble"] },
    { emoji: "🗯️", keywords: ["right", "anger", "bubble"] },
    { emoji: "💭", keywords: ["thought", "bubble", "thinking", "gedanke"] },
    { emoji: "💤", keywords: ["zzz", "sleep", "schlafen", "tired"] },
    { emoji: "🔔", keywords: ["bell", "glocke", "notification"] },
    { emoji: "🔕", keywords: ["no", "bell", "mute", "stumm"] },
    { emoji: "🎵", keywords: ["music", "note", "musik"] },
    { emoji: "🎶", keywords: ["music", "notes", "musik"] },
    { emoji: "➕", keywords: ["plus", "add", "hinzufügen"] },
    { emoji: "➖", keywords: ["minus", "subtract", "entfernen"] },
    { emoji: "➗", keywords: ["divide", "division", "teilen"] },
    { emoji: "✖️", keywords: ["multiply", "x", "mal"] },
    { emoji: "♾️", keywords: ["infinity", "unendlich", "forever"] },
    { emoji: "💲", keywords: ["dollar", "money", "geld"] },
    { emoji: "💱", keywords: ["currency", "exchange", "währung"] },
    { emoji: "™️", keywords: ["trademark", "marke"] },
    { emoji: "©️", keywords: ["copyright", "urheberrecht"] },
    { emoji: "®️", keywords: ["registered", "marke"] },
    { emoji: "〰️", keywords: ["wavy", "dash", "line"] },
    { emoji: "➰", keywords: ["curly", "loop", "schleife"] },
    { emoji: "➿", keywords: ["double", "curly", "loop"] },
    { emoji: "🔚", keywords: ["end", "ende", "arrow"] },
    { emoji: "🔙", keywords: ["back", "zurück", "arrow"] },
    { emoji: "🔛", keywords: ["on", "arrow", "mark"] },
    { emoji: "🔝", keywords: ["top", "oben", "arrow"] },
    { emoji: "🔜", keywords: ["soon", "bald", "arrow"] },
    { emoji: "✔️", keywords: ["check", "mark", "done", "ok"] },
    { emoji: "☑️", keywords: ["ballot", "check", "box"] },
    { emoji: "🔘", keywords: ["radio", "button", "option"] },
    { emoji: "🔴", keywords: ["red", "circle", "rot", "kreis"] },
    { emoji: "🟠", keywords: ["orange", "circle", "kreis"] },
    { emoji: "🟡", keywords: ["yellow", "circle", "gelb", "kreis"] },
    { emoji: "🟢", keywords: ["green", "circle", "grün", "kreis"] },
    { emoji: "🔵", keywords: ["blue", "circle", "blau", "kreis"] },
    { emoji: "🟣", keywords: ["purple", "circle", "lila", "kreis"] },
    { emoji: "🟤", keywords: ["brown", "circle", "braun", "kreis"] },
    { emoji: "⚫", keywords: ["black", "circle", "schwarz", "kreis"] },
    { emoji: "⚪", keywords: ["white", "circle", "weiß", "kreis"] },
    { emoji: "🟥", keywords: ["red", "square", "rot", "quadrat"] },
    { emoji: "🟧", keywords: ["orange", "square", "quadrat"] },
    { emoji: "🟨", keywords: ["yellow", "square", "gelb", "quadrat"] },
    { emoji: "🟩", keywords: ["green", "square", "grün", "quadrat"] },
    { emoji: "🟦", keywords: ["blue", "square", "blau", "quadrat"] },
    { emoji: "🟪", keywords: ["purple", "square", "lila", "quadrat"] },
    { emoji: "🟫", keywords: ["brown", "square", "braun", "quadrat"] },
    { emoji: "⬛", keywords: ["black", "square", "schwarz", "quadrat"] },
    { emoji: "⬜", keywords: ["white", "square", "weiß", "quadrat"] },
    { emoji: "◼️", keywords: ["black", "medium", "square"] },
    { emoji: "◻️", keywords: ["white", "medium", "square"] },
    { emoji: "🔶", keywords: ["orange", "diamond", "raute"] },
    { emoji: "🔷", keywords: ["blue", "diamond", "raute"] },
    { emoji: "🔸", keywords: ["small", "orange", "diamond"] },
    { emoji: "🔹", keywords: ["small", "blue", "diamond"] },
    { emoji: "🔺", keywords: ["red", "triangle", "up", "dreieck"] },
    { emoji: "🔻", keywords: ["red", "triangle", "down", "dreieck"] },
    { emoji: "💠", keywords: ["diamond", "cute", "flower"] },
    { emoji: "🔲", keywords: ["black", "square", "button"] },
    { emoji: "🔳", keywords: ["white", "square", "button"] },
    { emoji: "⏸️", keywords: ["pause", "button", "pausieren"] },
    { emoji: "⏹️", keywords: ["stop", "button", "stoppen"] },
    { emoji: "⏺️", keywords: ["record", "button", "aufnehmen"] },
    { emoji: "⏭️", keywords: ["next", "track", "button", "weiter"] },
    { emoji: "⏮️", keywords: ["previous", "track", "button", "zurück"] },
    { emoji: "⏩", keywords: ["fast", "forward", "vorspulen"] },
    { emoji: "⏪", keywords: ["rewind", "zurückspulen"] },
    { emoji: "⏫", keywords: ["fast", "up", "button"] },
    { emoji: "⏬", keywords: ["fast", "down", "button"] },
    { emoji: "◀️", keywords: ["reverse", "button", "zurück"] },
    { emoji: "▶️", keywords: ["play", "button", "abspielen"] },
    { emoji: "🔀", keywords: ["shuffle", "tracks", "zufällig"] },
    { emoji: "🔁", keywords: ["repeat", "wiederholen"] },
    { emoji: "🔂", keywords: ["repeat", "single", "wiederholen"] },
    { emoji: "🔃", keywords: ["clockwise", "arrows", "reload"] },
    { emoji: "🔄", keywords: ["counterclockwise", "arrows", "refresh"] },
    { emoji: "🔼", keywords: ["upwards", "button", "hoch"] },
    { emoji: "🔽", keywords: ["downwards", "button", "runter"] },
    { emoji: "⬆️", keywords: ["up", "arrow", "hoch", "pfeil"] },
    { emoji: "⬇️", keywords: ["down", "arrow", "runter", "pfeil"] },
    { emoji: "⬅️", keywords: ["left", "arrow", "links", "pfeil"] },
    { emoji: "➡️", keywords: ["right", "arrow", "rechts", "pfeil"] },
    { emoji: "↗️", keywords: ["up", "right", "arrow", "pfeil"] },
    { emoji: "↘️", keywords: ["down", "right", "arrow", "pfeil"] },
    { emoji: "↙️", keywords: ["down", "left", "arrow", "pfeil"] },
    { emoji: "↖️", keywords: ["up", "left", "arrow", "pfeil"] },
    { emoji: "↕️", keywords: ["up", "down", "arrow", "pfeil"] },
    { emoji: "↔️", keywords: ["left", "right", "arrow", "pfeil"] },
    { emoji: "↩️", keywords: ["right", "arrow", "curving", "left"] },
    { emoji: "↪️", keywords: ["left", "arrow", "curving", "right"] },
    { emoji: "⤴️", keywords: ["right", "arrow", "curving", "up"] },
    { emoji: "⤵️", keywords: ["right", "arrow", "curving", "down"] },
  ],
};

// Storage key for recent emojis
const RECENT_EMOJIS_KEY = "ohweees-recent-emojis";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("smileys");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load recent emojis from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
    if (stored) {
      try {
        setRecentEmojis(JSON.parse(stored));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Handle emoji selection
  const handleSelect = (emoji: string) => {
    // Add to recent emojis
    const newRecent = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, 24);
    setRecentEmojis(newRecent);
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(newRecent));
    
    onSelect(emoji);
    onClose();
  };

  // Filter emojis by search query
  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase();
    const results: { emoji: string; keywords: string[] }[] = [];
    
    for (const category of Object.values(EMOJIS)) {
      for (const item of category) {
        if (
          item.emoji.includes(query) ||
          item.keywords.some((k) => k.includes(query))
        ) {
          results.push(item);
        }
      }
    }
    
    return results.slice(0, 50);
  }, [searchQuery]);

  // Get emojis for current category
  const categoryEmojis = useMemo(() => {
    if (selectedCategory === "recent") {
      return recentEmojis.map((emoji) => ({ emoji, keywords: [] }));
    }
    return EMOJIS[selectedCategory] || [];
  }, [selectedCategory, recentEmojis]);

  return (
    <div
      ref={pickerRef}
      className="bg-popover border rounded-xl shadow-xl w-80 overflow-hidden"
    >
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Emoji suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Category tabs */}
      {!searchQuery && (
        <div className="flex border-b px-1 py-1 gap-0.5 overflow-x-auto">
          {EMOJI_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.id;
            const hasEmojis = category.id === "recent" ? recentEmojis.length > 0 : true;
            
            if (!hasEmojis) return null;
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                title={category.name}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji grid */}
      <ScrollArea className="h-64">
        <div className="p-2">
          {searchQuery ? (
            <>
              {filteredEmojis && filteredEmojis.length > 0 ? (
                <div className="grid grid-cols-8 gap-1">
                  {filteredEmojis.map((item, index) => (
                    <button
                      key={`${item.emoji}-${index}`}
                      onClick={() => handleSelect(item.emoji)}
                      className="p-1.5 text-xl hover:bg-muted rounded-md transition-colors"
                      title={item.keywords.join(", ")}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Keine Emojis gefunden
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
                {EMOJI_CATEGORIES.find((c) => c.id === selectedCategory)?.name}
              </div>
              {categoryEmojis.length > 0 ? (
                <div className="grid grid-cols-8 gap-1">
                  {categoryEmojis.map((item, index) => (
                    <button
                      key={`${item.emoji}-${index}`}
                      onClick={() => handleSelect(item.emoji)}
                      className="p-1.5 text-xl hover:bg-muted rounded-md transition-colors"
                      title={item.keywords.join(", ")}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {selectedCategory === "recent"
                    ? "Noch keine kürzlich verwendeten Emojis"
                    : "Keine Emojis in dieser Kategorie"}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
