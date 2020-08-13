export default function ({ store, redirect }) {
    if (store.state.logged === true) {
        return redirect('/');
    }
}
