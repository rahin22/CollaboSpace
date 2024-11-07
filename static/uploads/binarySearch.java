public int[] toArray() {
    List<Integer> list = new ArrayList<>();
    inOrderTraversal(root, list);
    int[] array = new int[list.size()];
    for (int i = 0; i < list.size(); i++) {
        array[i] = list.get(i);
    }
    return array;
}

private void inOrderTraversal(node current, List<Integer> list) {
    if (current != null) {
        inOrderTraversal(current.left, list);
        list.add(current.key);
        inOrderTraversal(current.right, list);
    }
}