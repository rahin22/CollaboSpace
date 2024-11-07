# Sample data - list of dictionaries representing items
items = [
    {'name': 'apple', 'color': 'red', 'price': 1.0},
    {'name': 'banana', 'color': 'yellow', 'price': 0.5},
    {'name': 'orange', 'color': 'orange', 'price': 0.8},
    {'name': 'grape', 'color': 'purple', 'price': 1.2},
    {'name': 'kiwi', 'color': 'green', 'price': 0.7}
]

# Function to filter items based on a specific key-value pair
def filter_items(data, key, value):
    filtered_items = []
    for item in data:
        if item.get(key) == value:
            filtered_items.append(item)
    return filtered_items

# Example usage
filtered_items = filter_items(items, key='color', value='red')
print("Filtered Items:", filtered_items)
