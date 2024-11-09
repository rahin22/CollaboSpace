from manim import *

class MassGraph(Scene):
    def construct(self):
        # Data points
        days = [0, 1, 2, 3, 4, 5, 6]
        nail1_mass = [6.4, 6.4, 6.4, 6.4, 6.41, 6.41, 6.41]
        nail2_mass = [6.4, 6.4, 6.42, 6.43, 6.45, 6.46, 6.49]

        # Create axes
        axes = Axes(
            x_range=[0, 6, 1],  # x-axis range from 0 to 6 with step of 1
            y_range=[6.39, 6.5, 0.05],  # y-axis range from 6.3 to 6.5 with step of 0.05
            axis_config={"include_numbers": True},
        ).add_coordinates()

        # Labels for the axes
        x_label = Text("Day").next_to(axes.x_axis, RIGHT)
        y_label = Text("Mass (g)").rotate(PI / 2).next_to(axes.y_axis, UP)

        # Title for the graph
        graph_title = Title("Mass of Nails Over Time")

        # Create graph lines for nail 1 and nail 2
        nail1_graph = axes.plot_line_graph(
            x_values=days,
            y_values=nail1_mass,
            line_color=BLUE,
            add_vertex_dots=True,
            vertex_dot_style={"color": BLUE}
        )
        nail2_graph = axes.plot_line_graph(
            x_values=days,
            y_values=nail2_mass,
            line_color=RED,
            add_vertex_dots=True,
            vertex_dot_style={"color": RED}
        )

        # Create legends
        nail1_label = Text("Nail 1 Mass (Protected)").set_color(BLUE).scale(0.5).next_to(axes, UP, buff=0.5)
        nail2_label = Text("Nail 2 Mass (Unprotected)").set_color(RED).scale(0.5).next_to(nail1_label, DOWN, buff=0.1)

        # Add all elements to the scene
        self.play(Create(axes), Write(graph_title))
        self.play(Write(x_label), Write(y_label))
        self.play(Create(nail1_graph), Write(nail1_label))
        self.play(Create(nail2_graph), Write(nail2_label))

        # Pause to display the graph
        self.wait(2)


