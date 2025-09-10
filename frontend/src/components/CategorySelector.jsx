import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useMessage } from '../contexts/MessageContext'
import api from '../services/api'

const CategorySelector = ({ onCategoriesSelected }) => {
  const { user } = useAuth()
  const { showSuccess, showError } = useMessage()
  const [categories, setCategories] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchSelectedCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await api.get('/categories')
      setCategories(response.data.data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      showError('Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  const fetchSelectedCategories = async () => {
    try {
      const response = await api.get('/brands/categories')
      setSelectedCategories(response.data.data || [])
    } catch (error) {
      console.error('Error fetching selected categories:', error)
    }
  }

  const handleCategoryToggle = (category, subcategory) => {
    const key = `${category}-${subcategory}`
    setSelectedCategories(prev => {
      const exists = prev.find(item => item.category === category && item.sub_category === subcategory)
      if (exists) {
        return prev.filter(item => !(item.category === category && item.sub_category === subcategory))
      } else {
        return [...prev, { category, sub_category: subcategory }]
      }
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await api.post('/brands/categories', { categories: selectedCategories })
      showSuccess('Categories saved successfully!')
      if (onCategoriesSelected) {
        onCategoriesSelected(selectedCategories)
      }
    } catch (error) {
      console.error('Error saving categories:', error)
      showError('Failed to save categories')
    } finally {
      setSaving(false)
    }
  }

  const isSelected = (category, subcategory) => {
    return selectedCategories.some(item => 
      item.category === category && item.sub_category === subcategory
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Select Categories for FIT Score Analysis
        </h3>
        <p className="text-sm text-gray-600">
          Choose the categories and subcategories that your brand operates in. 
          This will be used to calculate FIT scores with retailers.
        </p>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {categories.map((category) => (
          <div key={category.category} className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">{category.category}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {category.subcategories?.map((subcategory) => (
                <label
                  key={subcategory}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={isSelected(category.category, subcategory)}
                    onChange={() => handleCategoryToggle(category.category, subcategory)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{subcategory}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {selectedCategories.length} categories selected
        </div>
        <button
          onClick={handleSave}
          disabled={saving || selectedCategories.length === 0}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Categories'}
        </button>
      </div>
    </div>
  )
}

export default CategorySelector
