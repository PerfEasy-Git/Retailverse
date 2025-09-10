import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useMessage } from '../contexts/MessageContext'
import api from '../services/api'
import { Plus, Mail, User, Trash2, Edit } from 'lucide-react'

const UserManagement = () => {
  const { user } = useAuth()
  const { showSuccess, showError } = useMessage()
  const [users, setUsers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'brand_user',
    first_name: '',
    last_name: ''
  })

  useEffect(() => {
    fetchUsers()
    fetchInvitations()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/company')
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      showError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvitations = async () => {
    try {
      const response = await api.get('/invitations')
      setInvitations(response.data.data || [])
    } catch (error) {
      console.error('Error fetching invitations:', error)
    }
  }

  const handleInviteUser = async (e) => {
    e.preventDefault()
    try {
      await api.post('/invitations/send', inviteForm)
      showSuccess('Invitation sent successfully!')
      setInviteForm({
        email: '',
        role: 'brand_user',
        first_name: '',
        last_name: ''
      })
      setShowInviteForm(false)
      fetchInvitations()
    } catch (error) {
      console.error('Error sending invitation:', error)
      showError(error.response?.data?.error || 'Failed to send invitation')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return
    }

    try {
      await api.delete(`/users/${userId}`)
      showSuccess('User deleted successfully!')
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      showError('Failed to delete user')
    }
  }

  const handleToggleUserStatus = async (userId, isActive) => {
    try {
      await api.patch(`/users/${userId}/status`, { is_active: !isActive })
      showSuccess(`User ${!isActive ? 'activated' : 'deactivated'} successfully!`)
      fetchUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
      showError('Failed to update user status')
    }
  }

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'brand_admin': 'Brand Admin',
      'brand_user': 'Brand User',
      'retailer_admin': 'Retailer Admin',
      'retailer_user': 'Retailer User'
    }
    return roleMap[role] || role
  }

  const getCompanyType = () => {
    return user?.company_type === 'brand' ? 'brand' : 'retailer'
  }

  const getAvailableRoles = () => {
    const companyType = getCompanyType()
    return companyType === 'brand' 
      ? ['brand_user']
      : ['retailer_user']
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage users in your organization</p>
        </div>
        <button
          onClick={() => setShowInviteForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Invite User</span>
        </button>
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New User</h3>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {getAvailableRoles().map(role => (
                    <option key={role} value={role}>
                      {getRoleDisplayName(role)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={inviteForm.first_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={inviteForm.last_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Active Users</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {users.map((userItem) => (
            <div key={userItem.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {userItem.first_name} {userItem.last_name}
                  </div>
                  <div className="text-sm text-gray-500">{userItem.email}</div>
                  <div className="text-xs text-gray-400">
                    {getRoleDisplayName(userItem.role)}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggleUserStatus(userItem.id, userItem.is_active)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    userItem.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {userItem.is_active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleDeleteUser(userItem.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Pending Invitations</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {invitation.email}
                    </div>
                    <div className="text-xs text-gray-400">
                      {getRoleDisplayName(invitation.role)} • Sent {new Date(invitation.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Expires {new Date(invitation.expires_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
