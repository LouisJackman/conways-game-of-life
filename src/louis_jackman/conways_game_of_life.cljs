;;;;
;;;; Conway's Game of Life
;;;;


(ns louis-jackman.conways-game-of-life
  (:require [clojure.math :refer [floor]]))



;;;
;;; Utilities
;;;


(defrecord Coordinates
    ;; Coordinates used to represent cells within areas.
    [x y])


;; Element Lookups

(defn query-selector-or-throw
  "Lookup an element via `querySelector`; if nothing is found, throw an
  exception."
  ([query-selector]
   (query-selector-or-throw js/document query-selector))
  ([element query-selector]
   (if-let [result (.querySelector element
                                   query-selector)]
     result
     (throw (ex-info "DOM root element not found"
                     {:parent element
                      :selector query-selector})))))

(defn canvas-context-or-throw
  "Yield a 2D context from a canvas. If 2D contexts are not supported, throw
  an exception."
  [canvas]
  (if-let [context (.getContext canvas "2d")]
    context
    (throw (ex-info "2D context could not be acquired from canvas"
                    {:canvas canvas}))))


;; Element Creation

(defn elem
  "Create a new element of `elem-name`. If keyword arguments are provided,
  they become set attributes. That is performed via `setAttribute` and uses
  the keyword name as the property name, and assignes to it value as a
  string."
  [elem-name & {:as attrs}]
  (let [elem (.createElement js/document elem-name)]
    (doseq [[attr-name attr-value] attrs]
      (.setAttribute elem (name attr-name) (str attr-value)))
    elem))

(defn text
  "Create a text node with content `content`."
  [content]
  (.createTextNode js/document content))

(defn add-class
  "Add class `class` to `elem`. Unlike assigning the `class` attribute, do not
  remove existing classes."
  [elem class]
  (let [class-list (.-classList elem)]
    (.add class-list class)))



;;;
;;; Simulation Logic — Cells & Areas
;;;


(def dead-cell false)
(def alive-cell true)
(def cell-alive? (partial = alive-cell))
(def cell-dead? (partial = dead-cell))


;; An area is a 2 dimensional vector created by nesting vectors.

(defn ->blank-area
  "Create a blank area with dimensions `width` and `height`."
  [& {:keys [width height]}]
  (let [blank-row (into []
                        (repeat width dead-cell))]
    (into [] (repeat height blank-row))))

(defn area->string
  "Emit an area as a multline string. Useful for debugging without a UI."
  [area]
  (apply str (apply concat
                    (for [row area]
                      (concat (for [cell row]
                                (if cell
                                  \#
                                  \space))
                              [\newline])))))

(defn get-area-cell
  "Get a cell from an area using `Coordinates`."
  [area {:keys [x y]}]
  ((area y) x))

(defn- set-area-cell
  "Set a cell in an area using `Coordinates`, returning a new, modified area."
  [& {{:keys [x y]} :coordinates
      :keys [area new-state]}]
  (assoc area
         y
         (assoc (area y)
                x
                new-state)))

(def spawn-area-cell
  "Make a cell alive if it is not already, in an area using
  `Coordinates`. Return a new, modified area."
  (partial set-area-cell :new-state alive-cell))

(def kill-area-cell
  "Make a cell dead if it is not already, in an area using `Coordinates`.
  Return a new, modified area."
  (partial set-area-cell :new-state dead-cell))

(defn- set-area-cells
  "Set multiple cells in an area using a sequence of maps; each map contains a
  `:coordinates` value indicating the cell to set via `Coordinates`, and a
  `:new-state` value stating to what to set the cell."
  [& {:keys [area cells-to-set]}]
  (reduce (fn [area {:keys [coordinates new-state]}]
            (set-area-cell :area area
                           :coordinates coordinates
                           :new-state new-state))
          area
          cells-to-set))

(def ^:private default-area-width 60)
(def ^:private default-area-height 40)

(defn area-with-starting-cells
  "Create a new area with initial cells, e.g. a starting glider."
  [& {:keys [alive-cells-at-start
             area-width
             area-height]
      :or {area-width default-area-width
           area-height default-area-height}}]
  (let [blank-area (->blank-area :width area-width
                                 :height area-height)
        cells-to-set (for [coordinates alive-cells-at-start]
                       {:coordinates coordinates
                        :new-state alive-cell})]
    (set-area-cells :area blank-area
                    :cells-to-set cells-to-set)))


;; Simulation Stepping

(defn- clamp-neighbours
  "Ensure neighbours of a cell don't exceed the area boundaries, pruning them
  out if so."
  [& {:keys [area neighbours]}]
  (let [height (count area)
        width (count (first area))]
    (->> neighbours
         (filter (fn [{:keys [x y]}]
                   (and (< -1 x width)
                        (< -1 y height)))))))

(defn- next-cell-state-transition
  "Step the simulation of single cell of an area once."
  [& {{:keys [x y] :as cell-coordinates} :cell
      :keys [area]}]

  (let [cell (get-area-cell area cell-coordinates)
        unclamped-neighbours (map (partial apply ->Coordinates)
                                  [[(dec x) (dec y)]
                                   [x (dec y)]
                                   [(inc x) (dec y)]
                                   [(dec x) y]
                                   [(inc x) y]
                                   [(dec x) (inc y)]
                                   [x (inc y)]
                                   [(inc x) (inc y)]])
        neighbours (clamp-neighbours :area area
                                     :neighbours unclamped-neighbours)
        alive-neighbours (->> neighbours
                              (map (partial get-area-cell area))
                              (filter cell-alive?)
                              count)]

    ;; `:no-change` allows the caller to `assoc` only changes rather than
    ;; recreating the entire area per state transition.
    (if (cell-alive? cell)
      (if (<= 2 alive-neighbours 3)
        :no-change
        :kill)
      (if (= alive-neighbours 3)
        :spawn
        :no-change))))

(defn step-area-state
  "Step the simulation of a whole area once."
  [area]
  (let [all-transitions
        (for [y (range (count area))
              x (range (count (area y)))]
          (let [coordinates (->Coordinates x y)]
            [coordinates
             (next-cell-state-transition :area area
                                         :cell coordinates)]))
        relevant-transitions (filter #(not= (second %)
                                            :no-change)
                                     all-transitions)
        state-replacements (for [[cell transition] relevant-transitions]
                             {:coordinates cell
                              :new-state (case transition
                                           :kill dead-cell
                                           :spawn alive-cell)})]
    (set-area-cells :area area
                    :cells-to-set state-replacements)))



;;;
;;; UI
;;;


;; Canvas Drawing for the Base Visualisation

(def ^:private default-cell-pixel-width 10)
(def ^:private default-cell-pixel-height 10)

(def ^:private default-canvas-pixel-width 600)
(def ^:private default-canvas-pixel-height 400)

(def cell-fill-styles
  {alive-cell "white"
   dead-cell "black"})

(defn draw-area
  "Draw an area's current state to a 2D canvas."
  [& {:keys [area
             canvas-context
             cell-pixel-width
             cell-pixel-height]}]

  (doseq [[y row] (map-indexed vector area)
          [x cell] (map-indexed vector row)]
    (let [fill-style (cell-fill-styles cell)
          fill-x (* x cell-pixel-width)
          fill-y (* y cell-pixel-height)]
      (set! (.-fillStyle canvas-context) fill-style)
      (.fillRect canvas-context
                 fill-x
                 fill-y
                 cell-pixel-width
                 cell-pixel-height))))


;; Controls for the Simulation

(defn- ->ui-controls
  "Create a form of UI controls with which to control the simulation."
  [& {:keys [on-play-pause-change
             on-steps-per-second-change]}]

  (let [play-pause-button-text (text "Pause")
        play-pause-button-on-click
        (fn [event]
          (let [target (.-target event)
                text (.-textContent target)
                [new-text new-state] (case text
                                       "Play" ["Pause" :playing]
                                       "Pause" ["Play" :paused])]
            (on-play-pause-change new-state)
            (set! (.-textContent target) new-text)))

        play-pause-button (doto (elem "button" :type "button")
                            (.addEventListener "click"
                                               play-pause-button-on-click))
        play-pause-spacer (elem "span")
        play-pause-label-text (text "The simulation is paused.")
        play-pause-label (elem "label")

        steps-per-second-input (elem "input"
                                     :type "number"
                                     :value 4)

        steps-per-second-button-text (text "Update")
        steps-per-second-label-text (text "Running at 4 steps per second.")
        steps-per-second-label (elem "label")

        steps-per-second-button-on-click
        (fn [event]
          (let [str-value (.-value steps-per-second-input)]
            (-> str-value
                parse-long
                on-steps-per-second-change)
            (set! (.-textContent steps-per-second-label-text)
                  (str "Running at " str-value " steps per second."))))

        steps-per-second-button
        (doto (elem "button" :type "button")
          (.addEventListener "click"
                             steps-per-second-button-on-click))

        form (doto (elem "form")
               (add-class "controls"))]

    (.append play-pause-button play-pause-button-text)
    (.append play-pause-label play-pause-label-text)
    (.append steps-per-second-button steps-per-second-button-text)
    (.append steps-per-second-label steps-per-second-label-text)
    (.append form
             play-pause-label
             play-pause-spacer
             play-pause-button
             steps-per-second-label
             steps-per-second-input
             steps-per-second-button)
    form))

(defn- ->ui
  "Create a UI to introduce and control the simulation."
  [& {:keys [canvas
             cell-pixel-width
             cell-pixel-height
             on-play-pause-change
             on-steps-per-second-change
             on-canvas-mousedown]}]

  (let [h1 (elem "h1")
        h1-text (text "Conway's Game of Life")
        p-1-text (text (str "Clicking a cell changes its state: dead to "
                            "alive, alive to dead. The simulation often "
                            "kills cells as soon as they're spawned, so try "
                            "pausing whilst doing it."))
        p-1 (doto (elem "p")
              (.append p-1-text))
        p-2-text (text (str "This simulation is entirely client-side; saving "
                            "the page allows offline use."))
        p-2 (doto (elem "p")
              (.append p-2-text))
        hr (elem "hr")
        controls (->ui-controls
                  :on-play-pause-change on-play-pause-change
                  :on-steps-per-second-change on-steps-per-second-change)

        on-canvas-mousedown-event
        (fn [event]
          (let [x (floor (/ (.-offsetX event) cell-pixel-width))
                y (floor (/ (.-offsetY event) cell-pixel-height))]
            (on-canvas-mousedown :cell-coordinates (->Coordinates x y))))

        fragment (.createDocumentFragment js/document)]

    (.addEventListener canvas "mousedown" on-canvas-mousedown-event)
    (.append h1 h1-text)
    (.append fragment h1 p-1 p-2 hr controls canvas)
    fragment))


;; Styling for the Whole Web Application

(def style
  "A stylesheet for the whole web application, even beyond the provided DOM
  root."
  "

  body {
      background-color: #111;
      color: #ddd;
  }

  #app h1 {
      text-align: center;
  }

  #app {
      margin-left: auto;
      margin-right: auto;
      width: 600px;
  }

  #app .controls {
      display: grid;
      grid-template-columns: 3fr 2fr 1fr;
      gap: 5px;
      margin-top: 15px;
      margin-bottom: 15px;
  }

  #app .controls button {
      padding: 5px;
  }

  #app .controls label {
      text-align: right;
      line-height: 35px;
      margin-right: 15px;
  }

  #app canvas {
      border: solid 1px #ddd;
      display: block;
      margin-left: auto;
      margin-right: auto;
  }

")

(defn attach-stylesheet
  "Overwrite stylesheet attachments of `dom-root` with the content of
  `stylesheet`."
  [dom-root stylesheet]
  (let [sheet (js/CSSStyleSheet.)]
    (.replaceSync sheet stylesheet)
    (set! (.-adoptedStyleSheets js/document)
          [sheet])))



;;;
;;; Synchronisation of UI & Simulation State
;;;


(defrecord SimulationElement
    ;; A simulation element ties together a simulation's state and its UI root
    ;; DOM element. Logical state transitions should not leave this layer --
    ;; the rest of the leaf functions should be purely functional.
    ;;
    ;; Technically, multiple simulation elements can coexist and run
    ;; independently on the same page -- apart from some HTML `label` `for`
    ;; ID clashes.

    [dom-root
     canvas-context
     cell-pixel-width
     cell-pixel-height
     area-atom
     frame-in-milliseconds-atom
     interval-id-atom])

(defn SimulationElement-running?
  "Is a timer running in the background, moving this simulation forwards over
  time?"
  [{:keys [interval-id-atom]}]
  (some? @interval-id-atom))

(defn resume-SimulationElement
  "If a simulation element is not running, start it. Run a timer that steps
  the simulation and reflects its changes in the UI elements."
  [{:keys [area-atom
           cell-pixel-width
           cell-pixel-height
           dom-root
           canvas-context
           interval-id-atom
           frame-in-milliseconds-atom]
    :as simulation-element}]

  (when-not (SimulationElement-running? simulation-element)
    (let [frame-in-milliseconds @frame-in-milliseconds-atom

          interval-fn (fn []
                        (swap! area-atom step-area-state)
                        (draw-area :area @area-atom
                                   :canvas-context canvas-context
                                   :cell-pixel-width cell-pixel-width
                                   :cell-pixel-height cell-pixel-height))

          interval-id (js/setInterval interval-fn frame-in-milliseconds)]
      (reset! interval-id-atom interval-id))))

(defn pause-SimulationElement
  "Pause a simulation, halting any related timer code."
  [{:keys [interval-id-atom]
    :as simulation-element}]
  (when (SimulationElement-running? simulation-element)
    (js/clearInterval @interval-id-atom)
    (reset! interval-id-atom nil)))

(defn ->fresh-SimulationElement
  "Create a new, fresh simulation element. It assumes complete ownership of
  the DOM root referred to by `dom-root-query-selector`, removing all its
  children and repopulating it from scratch."
  [& {:keys [frame-in-milliseconds
             cell-pixel-width
             cell-pixel-height
             dom-root-query-selector
             area]
      :or {frame-in-milliseconds 250
           dom-root-query-selector "#app"
           cell-pixel-height default-cell-pixel-height
           cell-pixel-width default-cell-pixel-width}}]

  (let [area-atom (atom area)
        frame-in-milliseconds-atom (atom frame-in-milliseconds)
        interval-id-atom (atom nil)
        dom-root (query-selector-or-throw dom-root-query-selector)
        canvas (elem "canvas"
                     :width default-canvas-pixel-width
                     :height default-canvas-pixel-height)
        canvas-context (canvas-context-or-throw canvas)

        element (map->SimulationElement
                 {:area-atom area-atom
                  :cell-pixel-width cell-pixel-width
                  :cell-pixel-height cell-pixel-height
                  :interval-id-atom interval-id-atom
                  :frame-in-milliseconds-atom frame-in-milliseconds-atom
                  :dom-root dom-root
                  :canvas-context canvas-context})

        on-play-pause-change
        (fn [new-state]
          (let [apply-new-state
                (case new-state
                  :playing resume-SimulationElement
                  :paused pause-SimulationElement)]
            (apply-new-state element)))

        on-steps-per-second-change
        (fn [steps-per-second]
          (let [new-milliseconds-per-frame
                (/ 1000 steps-per-second)]
            (reset! frame-in-milliseconds-atom
                    new-milliseconds-per-frame)
            (when (SimulationElement-running? element)
              (pause-SimulationElement element)
              (resume-SimulationElement element))))

        on-canvas-mousedown
        (fn [& {:keys [cell-coordinates]}]
          (let [old (get-area-cell @area-atom cell-coordinates)
                new (condp = old
                      alive-cell dead-cell
                      dead-cell alive-cell)
                new-area (set-area-cell :area @area-atom
                                        :coordinates cell-coordinates
                                        :new-state new)]
            (reset! area-atom new-area)
            (draw-area :area new-area
                       :canvas-context canvas-context
                       :cell-pixel-width cell-pixel-width
                       :cell-pixel-height cell-pixel-height)))

        ui (->ui :canvas canvas
                 :cell-pixel-width cell-pixel-width
                 :cell-pixel-height cell-pixel-height
                 :on-play-pause-change on-play-pause-change
                 :on-steps-per-second-change on-steps-per-second-change
                 :on-canvas-mousedown on-canvas-mousedown)]

    (.replaceChildren dom-root ui)
    (attach-stylesheet dom-root style)
    element))

(def start-SimulationElement
  "An alias for resuming a simulation element, as it is the same effect."
  resume-SimulationElement)

(defn swap-SimulationElement!
  "Swap a simulation element for another one. In particular, ensure the
  previous one is shutdown with no more running timers before starting the new
  one. If they refer to the same DOM root, the previous simulation's UI is
  completely replaced."
  [simulation-atom & {simulation-replacement :with}]
  (when-let [simulation @simulation-atom]
    (when (SimulationElement-running? simulation)
      (pause-SimulationElement simulation)))
  (reset! simulation-atom simulation-replacement))



;;;
;;; Entrypoint
;;;


;; A singleton of a running game, used by `-main`. Relied upon only for
;; hotloading without resource leakages during local development, via
;; `swap-SimulationElement!`."
(defonce ^:private simulation-element
  (atom nil))


(defn- -main []
  (let [;; A glider.
        alive-cells-at-start (map (partial apply ->Coordinates)
                                  [[6 3]
                                   [7 4]
                                   [5 5]
                                   [6 5]
                                   [7 5]])

        area (area-with-starting-cells
              :alive-cells-at-start alive-cells-at-start)]

    ;; If code is hotloaded, swap out the existing one to ensure old
    ;; simulation resources are cleaned up.
    (swap-SimulationElement! simulation-element
                             :with (->fresh-SimulationElement :area area))

    (start-SimulationElement @simulation-element)))

(-main)

