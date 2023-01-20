import GameManager, { Play } from "./gameManager";
import { Clickable, GameModel, Position } from "./gameModel";
import Player from "./player";

type State = 'NOT_STARTED' | 'RUNNING' | 'FINISHED';

type TurnPhase = 'PLACE' | 'MOVE' | 'BUILD';

export default class OfflineGameManager implements GameManager {
    gameModel: GameModel;
    numberOfPlayers: number;
    players: Player[];
    state: State;

    /*
    [
    1: [ [x, y], ..., [x, y] ],
    2: [ [x, y], ..., [x, y] ],
    ...,
    n: [ [x, y], ..., [x, y] ]
    ]
     */
    builderPerPlayer: Position[][];
    selectedBuilderPosition: Position | undefined;
    currentPlayer: number = 0;
    turnPhase: TurnPhase | undefined;

    constructor(numberOfPlayers = 2) {
        this.gameModel = new GameModel();
        this.numberOfPlayers = numberOfPlayers;
        this.players = [];
        this.state = 'NOT_STARTED';
        this.builderPerPlayer = new Array<Position[]>();
        this.selectedBuilderPosition = undefined;
        this.currentPlayer = 0;
        this.turnPhase = undefined;
    }

    start() {
        let notEnoughPlayers = this.players.length != this.numberOfPlayers;
        if (notEnoughPlayers) throw new Error('[start] Not enough players');

        this.players.forEach(_ => this.builderPerPlayer.push([]));

        this.state = 'RUNNING';
        this.turnPhase = 'PLACE';
    }

    addPlayer(player: Player) {
        let gameAlreadyStarted = this.state != 'NOT_STARTED';
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
        let gameIsNotRunning = this.turnPhase == undefined;
        if (gameIsNotRunning) throw new Error('[getMove] Game not started yed.');

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

        //let squares = this.gameModel.board.squares;
        //for (let x = 0; x < squares.length; x++) {
        //    let x_column = squares[x];
        //    for (let y = 0; y < x_column.length; y++) {
        //        let availableSpace = this.gameModel.board.available(x, y);
        //        if (availableSpace){
        //            moves.push( new Move(Clickable.SPACE, x, y) );
        //        }
        //    }
        //}

        this.gameModel.board.squares.forEach((_, x) => {
            _.forEach((_, y) => {
                let position = new Position(x, y);
                let availableSpace = this.gameModel.board.available(position);
                if (availableSpace) {
                    plays.push(new Play(Clickable.SPACE, position));
                }
            });
        });
        return plays;
    }

    private moveGetHandler(): Play[] {
        let plays: Play[] = new Array<Play>();

        // There is a builder selected
        if (this.selectedBuilderPosition) {
            // create a play for each position the selected builder can go
            let position: Position = this.selectedBuilderPosition;
            let adjacentPositions = this.gameModel.board.adjacent(position);
            adjacentPositions.forEach(position => {
                plays.push(new Play(Clickable.SPACE, position));
            });
        }

        // create a play to select each builder
        let currentPlayerBuilders = this.builderPerPlayer[this.currentPlayer];
        currentPlayerBuilders.forEach(position => {
            plays.push(new Play(Clickable.SPACE, position))
        });

        return plays;
    }

    private buildGetHandler(): Play[] {
        let plays: Play[] = new Array<Play>();

        // No builder selected
        if (!this.selectedBuilderPosition) throw Error('[getPlays:MOVE] no builder selected');

        let position: Position = this.selectedBuilderPosition;
        let adjacentPositions = this.gameModel.board.adjacent(position);

        // filter spaces with builders
        adjacentPositions = adjacentPositions.filter(position => this.gameModel.board.available(position));

        // filter spaces too high
        let currentHeight: number = this.gameModel.board.height(position) - 1;
        adjacentPositions = adjacentPositions.filter(position => this.gameModel.board.height(position) < currentHeight + 2);

        adjacentPositions.forEach(position => {
            plays.push(new Play(Clickable.SPACE, position));
        });

        return plays;
    }

    play(play: Play) {
        let gameIsRunning = this.turnPhase == undefined;
        if (gameIsRunning) throw new Error('[play] Game not started yed.');

        switch (this.turnPhase) {
            case 'PLACE':
                return this.placePlayHandler(play);

            case 'MOVE':
                return this.movePlayHandler(play);

            case 'BUILD':
                return this.buildPlayHandler(play);
        }
        return [];
    }

    private placePlayHandler(play: Play) {
        let clickedSpace = play.click == Clickable.SPACE;
        if (clickedSpace) {
            // apply action

            // keep state
            let builders = this.builderPerPlayer[this.currentPlayer];
            builders.push(play.position);
            // modify model
            this.gameModel.place(play.position);

            // next player
            this.nextPlayer();

            // check if every player has already placed two builder to move into next phase
            let allPlayersPlacedAllBuilders = this.builderPerPlayer.every(builders => builders.length != 2);
            if (allPlayersPlacedAllBuilders) this.turnPhase = 'MOVE';
        }
    }
    private movePlayHandler(play: Play) {
        switch (play.click) {
            case Clickable.BUILDER:
                this.selectedBuilderPosition = play.position;
                break;

            case Clickable.SPACE:
                // check if there is a builder selected
                if (!this.selectedBuilderPosition) throw Error('');

                // move builder
                let fromPosition: Position = this.selectedBuilderPosition;
                let toPosition: Position = play.position;
                this.gameModel.board.move(fromPosition, toPosition);

                // update builder location state tracker
                this.builderPerPlayer[this.currentPlayer].forEach(pos => {
                    if (pos.x == fromPosition.x && pos.y == fromPosition.y) {
                        [pos.x, pos.y] = [toPosition.x, toPosition.y];
                    }
                });
                break;
        }
    }

    private buildPlayHandler(play: Play) {
        switch (play.click) {

            case Clickable.SPACE:
                this.gameModel.board.build(play.position);
                this.nextPlayer();
        }
    }
}