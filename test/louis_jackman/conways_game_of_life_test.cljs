(ns louis-jackman.conways-game-of-life-test
  (:require [cljs.test :refer-macros [deftest is testing]]
            [louis-jackman.conways-game-of-life :as gol
             :refer [->Coordinates
                     alive-cell dead-cell cell-alive? cell-dead?
                     ->blank-area get-area-cell
                     spawn-area-cell kill-area-cell
                     area-with-starting-cells step-area-state]]))


(deftest blank-area-test
  (let [area (->blank-area :width 3 :height 2)]
    (is (= 2 (count area)))
    (is (= 3 (count (first area))))
    (is (every? cell-dead?
                (for [y (range 2) x (range 3)]
                  (get-area-cell area (->Coordinates x y)))))))


(deftest spawn-and-kill-test
  (let [area (->blank-area :width 3 :height 3)
        coord (->Coordinates 1 1)
        spawned (spawn-area-cell :area area :coordinates coord)]
    (is (cell-alive? (get-area-cell spawned coord)))
    (let [killed (kill-area-cell :area spawned :coordinates coord)]
      (is (cell-dead? (get-area-cell killed coord))))))


(deftest area-with-starting-cells-test
  (let [cells [(->Coordinates 0 0) (->Coordinates 2 1)]
        area (area-with-starting-cells :alive-cells-at-start cells
                                       :area-width 3
                                       :area-height 2)]
    (is (cell-alive? (get-area-cell area (->Coordinates 0 0))))
    (is (cell-alive? (get-area-cell area (->Coordinates 2 1))))
    (is (cell-dead? (get-area-cell area (->Coordinates 1 0))))))


;; Game of Life rules:
;; 1. Underpopulation: alive cell with <2 neighbours dies
;; 2. Survival: alive cell with 2-3 neighbours lives
;; 3. Overpopulation: alive cell with >3 neighbours dies
;; 4. Reproduction: dead cell with exactly 3 neighbours becomes alive

(deftest underpopulation-test
  (testing "lone cell dies"
    (let [area (area-with-starting-cells :alive-cells-at-start [(->Coordinates 1 1)]
                                         :area-width 3
                                         :area-height 3)
          next (step-area-state area)]
      (is (cell-dead? (get-area-cell next (->Coordinates 1 1))))))

  (testing "cell with one neighbour dies"
    (let [area (area-with-starting-cells
                :alive-cells-at-start [(->Coordinates 1 1)
                                       (->Coordinates 2 1)]
                :area-width 4
                :area-height 3)
          next (step-area-state area)]
      (is (cell-dead? (get-area-cell next (->Coordinates 1 1))))
      (is (cell-dead? (get-area-cell next (->Coordinates 2 1)))))))


(deftest survival-test
  (testing "block (2x2 square) is stable"
    (let [cells [(->Coordinates 1 1)
                 (->Coordinates 2 1)
                 (->Coordinates 1 2)
                 (->Coordinates 2 2)]
          area (area-with-starting-cells :alive-cells-at-start cells
                                         :area-width 4
                                         :area-height 4)
          next (step-area-state area)]
      (doseq [c cells]
        (is (cell-alive? (get-area-cell next c)))))))


(deftest overpopulation-test
  (testing "centre cell with four neighbours dies"
    (let [area (area-with-starting-cells
                :alive-cells-at-start [(->Coordinates 1 0)
                                       (->Coordinates 0 1)
                                       (->Coordinates 1 1)
                                       (->Coordinates 2 1)
                                       (->Coordinates 1 2)]
                :area-width 3
                :area-height 3)
          next (step-area-state area)]
      (is (cell-dead? (get-area-cell next (->Coordinates 1 1)))))))


(deftest reproduction-test
  (testing "dead cell with exactly three neighbours becomes alive"
    (let [area (area-with-starting-cells
                :alive-cells-at-start [(->Coordinates 0 0)
                                       (->Coordinates 1 0)
                                       (->Coordinates 0 1)]
                :area-width 3
                :area-height 3)
          next (step-area-state area)]
      (is (cell-alive? (get-area-cell next (->Coordinates 1 1)))))))


(deftest blinker-oscillator-test
  (testing "horizontal blinker becomes vertical and back"
    (let [h-cells [(->Coordinates 1 2)
                   (->Coordinates 2 2)
                   (->Coordinates 3 2)]
          area (area-with-starting-cells :alive-cells-at-start h-cells
                                         :area-width 5
                                         :area-height 5)
          after-one (step-area-state area)
          after-two (step-area-state after-one)]

      ;; After one step: vertical blinker
      (is (cell-alive? (get-area-cell after-one (->Coordinates 2 1))))
      (is (cell-alive? (get-area-cell after-one (->Coordinates 2 2))))
      (is (cell-alive? (get-area-cell after-one (->Coordinates 2 3))))
      (is (cell-dead? (get-area-cell after-one (->Coordinates 1 2))))
      (is (cell-dead? (get-area-cell after-one (->Coordinates 3 2))))

      ;; After two steps: back to horizontal
      (doseq [c h-cells]
        (is (cell-alive? (get-area-cell after-two c)))))))
