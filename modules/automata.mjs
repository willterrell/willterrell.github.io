import { copyArray, getCoordinatesForCenteredSquare } from "./utilities.mjs";
import { Grid } from "./grid.mjs";
import { count } from "console";

export class Automata{
    constructor(id, ids, color, transitionRules, transitionPreference) {
        this.selfId = id;
        this.ids = ids;
        this.otherIds = ids.filter(n => n != id);
        this.internalColor = color;
        this.transitionRules = transitionRules;
        this.transitionPreference = transitionPreference;
    }
    get id() {
        return this.selfId;
    }
    get color() {
        return this.internalColor;
    }
    get rule() {
        return this.transitionRules;
    }
    get preference() {
        return this.transitionPreference;
    }
    set color(color) {
        this.internalColor = color;
    }
    toString() {
        let output = this.selfId + ": [\n";
        for (const id of this.preference) {
            output += "-> " + id +" \n";
            var subrule = this.rule[id];
            for (const id2 of this.ids) {
                var idRule = subrule[id2];
                output += "    " + id2 + ": " + idRule.toString() + ",\n";
            }
        }
        output += "]\n";
        return output;
    }
}

export function automatasToString(arrayOfAutomatas) {
    let out = "";
    for (const automata of arrayOfAutomatas) {
        out += automata.toString();
    }
    return out;
}

// random selection of 1-8
function randEight(includeZero, inclusionProbability) {
    let output = [];
    let start = 0;
    //           0    1    2    3    4    5    6    7    8
    let prob = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];//[0.1, 0.2, 0.3, 0.4, 0.5, 0.4, 0.3, 0.2, 0.1];
    prob = prob.map(function(x) {return x*inclusionProbability});
    if (!includeZero) start = 1;
    for (let i = start; i <= 8; i++) {
        var randDouble = Math.random();
        if (Math.random() < prob[i]) 
            output.push(i);
    }
    return output;
}

// random permutation
function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
}

function createRandomAutomata(id, ids, color, isBase, transitionProbability) {
    let selfId = id;
    let otherIds = ids.filter(n => n != id);
    let rule = copyArray(Array(ids.length).fill(Array(ids.length).fill([])));
    for (const id of otherIds) {
        for (const id2 of ids) {
            if (isBase && id2 == selfId)
                rule[id][id2] = [];
            else
                rule[id][id2] = randEight(!isBase, transitionProbability);
        }
    }
    let preference = shuffle(otherIds);
    return new Automata(id, ids, color, rule, preference);
}

// n includes the base automata
export function createNRandomAutomatas(colors, transitionProbability) {
    let n = colors.length;
    let ids = [...Array(n).keys()];
    let automatas = Array(n);
    let isBase = true;
    for (let id = 0; id < n; id++) {
        if (id == 0) isBase = true;
        else isBase = false;
        automatas[id] = createRandomAutomata(id, ids, colors[id], isBase, transitionProbability);
    }
    return automatas;
}

// continues searching for automata until function proceed returns false
// proceed: function, returns false when you want to end the search
// callback: function, has parameters foundAutomatas, success, responsible for storing the foundAutomatas
//      foundAutomatas: list of automatas found by the algorithm
//      success: whether the function has succeeded or has been stopped by proceed
export function searchForAutomatasOfDensity(colors, transitionProbability, minDensity, maxDensity, minActivity, iterations, size, proceed, callback) {
    let randomRadius = Math.floor(size/4);
    let coords = getCoordinatesForCenteredSquare(size, size, randomRadius);
    function testOneAutomata() {
        let automatas = createNRandomAutomatas(colors, transitionProbability);
        let testGrid = new Grid(size, size, automatas, false, null, null);
        let proceedRes = proceed();
        if (!proceedRes) {
            // give up if timed out
            callback(testGrid.automatas, false);
            return;
        }
        testGrid.randomizeAndClearGrid(coords[0], coords[1], coords[2], coords[3]);
        let sumDensity = 0, countedIterations = 0;
        for (let i = 0; i < iterations; i++) {
            testGrid.updateAutomataArrays();
            if (i > iterations/2) {
                let density = testGrid.getCurrentDensity();
                // if it's already growing large, preemptively quit
                if (density > 2 * maxDensity) {
                    // we want to run the code after this, so just make the density high enough so that it fails
                    sumDensity = iterations; 
                    break;
                }
                sumDensity += density;
                countedIterations++;
            }
        }
        let averageDensity = sumDensity/countedIterations;
        let endActivity = testGrid.getCurrentActivity();
        if (averageDensity > minDensity && averageDensity < maxDensity && endActivity > minActivity) {
            callback(testGrid.automatas, true);
            return;
        }
        setTimeout(testOneAutomata, 5);
    }
    testOneAutomata();
}

const regexTransitionRuleOfID = /(?<id>\d)[ ]*[=:][ ]*\n?[ ]*(?<content>[\[({][^\])}\[]+[\])}])/g;
const regexTransitionStatesToID = /->[ ]?(?<to>\d)\n?[ \t]*(?<content>[^-\]]+)(?=[-\]])/g;
const regexPossibleNeighborsOfID = /(?<id>\d):(?<content>(?!\n)[\d, ]+)/g;
const regexUnpackNeighbors = /((?<!\d)\d(?!\d)),?/g;
/*
Test out this regex
https://regex101.com/r/T6UbFP/1
https://regex101.com/r/z83qcJ/1
https://regex101.com/r/wz2L8H/1
https://regex101.com/r/JUVGOo/1
*/
function executeRegex(regex, str) {
    if (!str) return;
    let m;
    let out = [];
    while ((m = regex.exec(str)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        
        // The result can be accessed through the `m`-variable.
        out.push(m);
    }
    return out;
}

export function interpretImport(text, colors) {
    /*
    Example: text currently without any processing
    0: 
    -> 1
    1: 2, 3, 4,
    0: 1,
    1:
    -> 0
    0: 0, 8, 9
    1: 3, 4, 5
    */
    let processedIds = [];
    let processedTransitionRules = [];
    for (const transitionRule of executeRegex(regexTransitionRuleOfID, text)) {
        /*
        Extract Transition Rules for One Automata
        Match 0:
        -> 1
        1: 2, 3, 4,
        0: 1,
        */
        processedIds.push(parseInt(transitionRule[1]));
        processedTransitionRules.push(transitionRule[2]);
    }
    let numOfAutomatas = processedIds.length;
    let idsSorted = copyArray(processedIds).sort();
    let allAutomatas = Array(numOfAutomatas);
    for (let i = 0; i < numOfAutomatas; i++) {
        let id = processedIds[i];
        let preference = [];
        let rule = copyArray(Array(numOfAutomatas).fill(Array(numOfAutomatas).fill([])));
        for (const transitionToId of executeRegex(regexTransitionStatesToID, processedTransitionRules[i])) {
            /*
            Extract Neighbor Counts For Transition For All IDs
            Match 0:
            1: 2, 3, 4,
            0: 1,
            */
            let toId = parseInt(transitionToId[1]);
            if (!processedIds.includes(toId))
                continue;
            preference.push(toId);
            let transitionOptions = transitionToId[2];
            for (const transitionOption of executeRegex(regexPossibleNeighborsOfID, transitionOptions)) {
                 /*
                Extract Neighbor Counts For Transition For Each ID
                Match 0:
                [2, 3, 4]
                */
                let idForNeighbors = parseInt(transitionOption[1]);
                if (!processedIds.includes(idForNeighbors))
                    continue;
                let possibleNeighbors = executeRegex(regexUnpackNeighbors, transitionOption[2]).map((match) => parseInt(match[1]));
                rule[toId][idForNeighbors] = possibleNeighbors;
            }
        }
        allAutomatas[id] = new Automata(id, idsSorted, colors[id], rule, preference);
    }
    return allAutomatas
}