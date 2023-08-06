import GameManager, {TurnPhase} from "./gameManager";
import {Board} from "./model";
import Player from "./player";

import Play from "../view/messages";
import Position from "../common/position";

export default class OfflineGameManager implements GameManager {
    board: Board;
    numberOfPlayers: number;
    players: Player[];
    turnPhase: TurnPhase;

    /*
    [
    1: [ [x, y], ..., [x, y] ],
    2: [ [x, y], ..., [x, y] ],
    ...,
    n: [ [x, y], ..., [x, y] ]
    ]
     */
    selectedBuilderPosition: Position | undefined;
    builderPerPlayer: Position[][];
    movedBuilderPosition: Position | undefined;
    currentPlayer: number = 0;

    constructor(numberOfPlayers = 2) {
        this.board = new Board();
        this.numberOfPlayers = numberOfPlayers;
        this.players = [];
        this.turnPhase = 'NOT_STARTED';
        this.builderPerPlayer = new Array<Position[]>();
        //this.selectedBuilderPosition = undefined;
        this.currentPlayer = 0;
    }

    start() {
        let notEnoughPlayers = this.players.length != this.numberOfPlayers;
        if (notEnoughPlayers) throw new Error('[start] Not enough players');

        this.players.forEach(_ => this.builderPerPlayer.push([]));

        this.turnPhase = 'PLACE';
    }

    addPlayer(player: Player) {
        let gameAlreadyStarted = this.turnPhase != 'NOT_STARTED';
        if (gameAlreadyStarted) throw new Error('[addPlayer] Game Already Started');

        let maxNumberPlayersReached = this.players.length == this.numberOfPlayers;
        if (maxNumberPlayersReached) throw new Error('[addPlayer] Max Number of players reached.');

        let usernameAlreadyInUse = this.players.some(p => p.username == player.username);
        if (usernameAlreadyInUse) throw new Error('[addPlayer] Repeated player name');

        this.players.push(player);
    }

    private nextPlayer() {
        this.currentPlayer += 1;
        this.currentPlayer %= this.numberOfPlayers;
    }

    getPlays(): Play[] {
        let gameNotStarted = this.turnPhase == "NOT_STARTED";
        if (gameNotStarted) throw new Error('[getMove] Game not started yed.');

        let gameAlreadyFinished = this.turnPhase == "FINISHED";
        if (gameAlreadyFinished) throw new Error('[getMove] Game has already finished.');

        switch (this.turnPhase) {
            case 'PLACE':
                return this.placeGetHandler();

            case 'MOVE':
                return this.moveGetHandler();

            case 'BUILD':
                return this.buildGetHandler();
        }
        return [];
    }

    private placeGetHandler(): Play[] {
        // get new player actions
        let plays: Play[] = new Array<Play>();

        let squares = this.board.squares;
        squares.forEach( (column, x) => {
            column.forEach( (_, y) => {
                let position = new Position(x, y);
                let availableSpace = this.board.available(position);
                if (availableSpace) {
                    plays.push(new Play("PLACE", position));
                }
            });
        });
        return plays;
    }

    private moveGetHandler(): Play[] {
        let plays: Play[] = new Array<Play>();

        if (this.selectedBuilderPosition){
            let position: Position = this.selectedBuilderPosition;
            let adjacentPositions = this.board.adjacent(position);
            adjacentPositions.forEach(position => {
                plays.push(new Play("MOVE", position));
            });
        }

        let currentPlayerBuilders = this.builderPerPlayer[this.currentPlayer];
        currentPlayerBuilders.forEach(position => {
            plays.push(new Play("MOVE", position))
        });

        return plays;
    }

    private buildGetHandler(): Play[] {
        let plays: Play[] = new Array<Play>();

        // No builder selected
        if (!this.selectedBuilderPosition) throw Error('[getPlays:MOVE] no builder selected');

        let position: Position = this.selectedBuilderPosition;
        let adjacentPositions = this.board.adjacent(position);

        // filter spaces with builders
        adjacentPositions = adjacentPositions.filter(position => this.board.available(position));

        // filter spaces too high
        let currentHeight: number = this.board.size(position) - 1;
        adjacentPositions = adjacentPositions.filter(position => this.board.size(position) < currentHeight + 2);

        adjacentPositions.forEach(position => {
            plays.push(new Play("BUILD", position));
        });

        return plays;
    }

    play(play: Play){
        let gameIsRunning = this.turnPhase == undefined;
        if (gameIsRunning) throw new Error('[play] Game not started yed.');

        switch (this.turnPhase) {
            case 'PLACE':
                return this.placePlayHandler(play.source);
            case 'MOVE':
                if (play.destiny == undefined) return; // TODO handle
                return this.movePlayHandler(play.source, play.destiny);
            case 'BUILD':
                if (play.destiny == undefined) return; // TODO handle
                return this.buildPlayHandler(play.source, play.destiny);
        }

        throw Error("Unreachable code by design");
    }

    private placePlayHandler(source: Position){
        // modify model
        this.board.place(source);

        // keep state
        let builders = this.builderPerPlayer[this.currentPlayer];
        builders.push(source);

        // next player
        this.nextPlayer();

        // check if every player has already placed two builder to move into next phase
        let allPlayersPlacedAllBuilders = this.builderPerPlayer.every(builders => builders.length >= 2);
        if (allPlayersPlacedAllBuilders) this.turnPhase = 'MOVE';
    }

    private movePlayHandler(source: Position, destiny: Position){
        // save selected builder
        this.movedBuilderPosition = source;

        // move builder
        let fromPosition: Position = source;

        let toPosition: Position = destiny;
        this.board.move(fromPosition, toPosition);

        // update builder location state tracker
        this.builderPerPlayer[this.currentPlayer].forEach(pos => {
            if (pos.x == fromPosition.x && pos.y == fromPosition.y) {
                [pos.x, pos.y] = [toPosition.x, toPosition.y];
            }
        });
    }

    private buildPlayHandler(source: Position, destiny: Position){
        // TODO check if moved builder position is the one in the play.source
        if (source != this.movedBuilderPosition) throw Error('Error');

        this.board.build(destiny);
            this.nextPlayer();
        }
}