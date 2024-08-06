import { db } from '../src/database'
import { up } from './001_initial'

function run() {
    if (db.connection()) {
        console.log('Running migration')
        up()
            .then(() => console.log('Migration complete'))
            .catch((error) => console.error('Migration failed', error))
    }
}

run()