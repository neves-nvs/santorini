import { EventDispatcher } from 'three';

class EventManager {
    public readonly GAME_ACTION = 'gameAction';

    private static instance?: EventManager;
    private dispatcher: EventDispatcher;

    private constructor() {
        if (EventManager.instance) {
            throw new Error("Use Singleton.instance instead of new.");
        }
        EventManager.instance = this;
        this.dispatcher = new EventDispatcher();
    }

    public static getInstance(): EventManager {
        if (!EventManager.instance) {
            EventManager.instance = new EventManager();
        }
        return EventManager.instance;
    }

    public on(event: string, listener: (event: any) => void): void {
        this.dispatcher.addEventListener(event, listener);
    }

    public off(event: string, listener: (event: any) => void): void {
        this.dispatcher.removeEventListener(event, listener);
    }

    public dispatch(event: string, data: any): void {
        this.dispatcher.dispatchEvent({ type: event, data });
    }
}

const eventManager = EventManager.getInstance();
export default eventManager;