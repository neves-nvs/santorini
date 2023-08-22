import { Server } from "socket.io";

const io = new Server({
    cors: {
        origin: 'http://localhost:5173',
    }
})

const PORT = 3000;

io.listen(PORT);

io.on('connection', (socket) => {
    console.log('connected');

    socket.emit("hello")

    socket.on('disconnect', () => {
        console.log('disconnected');
    });

});
